import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { AppEnv } from "../env";
import { db } from "../db";
import {
  clearSessionCookie,
  currentUserId,
  requireAuth,
  setSessionCookie,
  signToken,
} from "../auth";
import { hashPassword, verifyPassword } from "../password";
import { ensureUserRecords } from "../lib/users";
import {
  appOrigin,
  codeChallenge,
  exchangeGoogleCode,
  fetchGoogleProfile,
  googleAuthorizeUrl,
  googleConfigured,
  googleRedirectUri,
  randomToken,
  upsertGoogleUser,
} from "../lib/google";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OAUTH_STATE_COOKIE = "carshare_oauth_state";
const OAUTH_VERIFIER_COOKIE = "carshare_oauth_verifier";
const OAUTH_TTL_SECONDS = 10 * 60;
const now = (): string => new Date().toISOString();
const readJson = async <T>(c: { req: { json: () => Promise<unknown> } }): Promise<T | null> => {
  try {
    return (await c.req.json()) as T;
  } catch {
    return null;
  }
};

export const authRoutes = (app: Hono<AppEnv>): void => {
  const auth = new Hono<AppEnv>();

  auth.post("/register", async (c) => {
    const body = await readJson<{
      email?: string;
      password?: string;
      fullName?: string;
      role?: string;
    }>(c);
    if (!body) return c.json({ error: "Invalid JSON body" }, 400);

    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";
    const fullName = body.fullName?.trim() || null;
    const role = body.role ?? "renter";

    if (!EMAIL_RE.test(email)) return c.json({ error: "A valid email is required" }, 400);
    if (password.length < 8) return c.json({ error: "Password must be at least 8 characters" }, 400);
    if (role !== "owner" && role !== "renter") {
      return c.json({ error: "Role must be owner or renter" }, 400);
    }

    try {
      const d = db(c.env);
      const existing = await d.execute({
        sql: "SELECT 1 FROM users WHERE email = ? COLLATE NOCASE",
        args: [email],
      });
      if (existing.rows.length) {
        return c.json({ error: "An account with this email already exists. Try signing in." }, 409);
      }

      const id = crypto.randomUUID();
      const passwordHash = await hashPassword(password);
      await d.batch([
        {
          sql: "INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?, ?, ?, ?, ?)",
          args: [id, email, passwordHash, fullName, now()],
        },
        {
          sql: `INSERT INTO profiles (id, user_id, full_name, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)`,
          args: [crypto.randomUUID(), id, fullName ?? email.split("@")[0], now(), now()],
        },
        {
          sql: "INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)",
          args: [crypto.randomUUID(), id, role],
        },
        {
          sql: `INSERT INTO subscriptions (id, user_id, plan, status, created_at, updated_at)
                VALUES (?, ?, 'free', 'active', ?, ?)`,
          args: [crypto.randomUUID(), id, now(), now()],
        },
      ]);

      const token = await signToken(c.env, { id, email });
      return c.json({ token, user: { id, email, fullName, isGuest: false } }, 201);
    } catch (err) {
      console.error("[auth] register failed:", err instanceof Error ? err.message : err);
      return c.json({ error: "Registration failed" }, 500);
    }
  });

  auth.post("/login", async (c) => {
    const body = await readJson<{ email?: string; password?: string }>(c);
    if (!body) return c.json({ error: "Invalid JSON body" }, 400);
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";
    if (!email || !password) return c.json({ error: "Email and password are required" }, 400);

    const { rows } = await db(c.env).execute({
      sql: "SELECT id, email, password_hash, name FROM users WHERE email = ? COLLATE NOCASE",
      args: [email],
    });
    const user = rows[0];
    if (!user || !(await verifyPassword(password, String(user.password_hash)))) {
      return c.json({ error: "Invalid email or password" }, 401);
    }

    const token = await signToken(c.env, { id: String(user.id), email: String(user.email) });
    return c.json({
      token,
      user: { id: String(user.id), email: String(user.email), fullName: user.name, isGuest: false },
    });
  });

  auth.get("/me", requireAuth, async (c) => {
    const userId = c.get("userId");
    const d = db(c.env);
    const [userRes, profileRes, rolesRes] = await Promise.all([
      d.execute({ sql: "SELECT id, email, name, is_guest FROM users WHERE id = ?", args: [userId] }),
      d.execute({ sql: "SELECT * FROM profiles WHERE user_id = ?", args: [userId] }),
      d.execute({ sql: "SELECT role FROM user_roles WHERE user_id = ?", args: [userId] }),
    ]);
    if (!userRes.rows.length) return c.json({ error: "Unauthorized" }, 401);
    return c.json({
      user: {
        id: String(userRes.rows[0].id),
        email: String(userRes.rows[0].email),
        fullName: userRes.rows[0].name,
        isGuest: Number(userRes.rows[0].is_guest) === 1,
      },
      profile: profileRes.rows[0] ?? null,
      roles: rolesRes.rows.map((r) => String(r.role)),
    });
  });

  auth.post("/guest", async (c) => {
    const id = crypto.randomUUID();
    const email = `guest-${id.slice(0, 8)}@guests.carshare.local`;
    const name = "Invité";
    const passwordHash = await hashPassword(randomToken(24));

    await db(c.env).execute({
      sql: `INSERT INTO users (id, email, password_hash, name, is_guest, created_at)
            VALUES (?, ?, ?, ?, 1, ?)`,
      args: [id, email, passwordHash, name, now()],
    });
    await ensureUserRecords(db(c.env), { id, email, name });

    const token = await signToken(c.env, { id, email });
    setSessionCookie(c, token);
    return c.json({ token, user: { id, email, fullName: name, isGuest: true } }, 201);
  });

  auth.post("/logout", (c) => {
    clearSessionCookie(c);
    deleteCookie(c, OAUTH_STATE_COOKIE, { path: "/" });
    deleteCookie(c, OAUTH_VERIFIER_COOKIE, { path: "/" });
    return c.json({ ok: true });
  });

  auth.get("/google", async (c) => {
    if (!googleConfigured(c.env)) {
      return c.json({ error: "Google sign-in is not configured" }, 503);
    }

    const state = randomToken(32);
    const verifier = randomToken(32);
    const challenge = await codeChallenge(verifier);
    const secure = new URL(c.req.url).protocol === "https:";
    const options = {
      path: "/",
      httpOnly: true,
      sameSite: "Lax" as const,
      secure,
      maxAge: OAUTH_TTL_SECONDS,
    };

    setCookie(c, OAUTH_STATE_COOKIE, state, options);
    setCookie(c, OAUTH_VERIFIER_COOKIE, verifier, options);

    const redirectUri = googleRedirectUri(c.env, c.req.url);
    return c.redirect(googleAuthorizeUrl(c.env, { redirectUri, state, challenge }), 302);
  });

  auth.get("/google/callback", async (c) => {
    const origin = appOrigin(c.env, c.req.url);
    const failure = `${origin}/auth?google=error`;
    const url = new URL(c.req.url);
    const error = url.searchParams.get("error");
    const code = url.searchParams.get("code") ?? "";
    const state = url.searchParams.get("state") ?? "";
    const expectedState = getCookie(c, OAUTH_STATE_COOKIE) ?? "";
    const verifier = getCookie(c, OAUTH_VERIFIER_COOKIE) ?? "";

    deleteCookie(c, OAUTH_STATE_COOKIE, { path: "/" });
    deleteCookie(c, OAUTH_VERIFIER_COOKIE, { path: "/" });

    if (!googleConfigured(c.env) || error) return c.redirect(failure, 302);
    if (!code || !state || !expectedState || state !== expectedState || !verifier) {
      return c.redirect(failure, 302);
    }

    try {
      const accessToken = await exchangeGoogleCode(c.env, {
        code,
        verifier,
        redirectUri: googleRedirectUri(c.env, c.req.url),
      });
      const profile = await fetchGoogleProfile(accessToken);
      const signedInUserId = await currentUserId(c);
      const userId = await upsertGoogleUser(c.env, db(c.env), profile, signedInUserId);
      const token = await signToken(c.env, { id: userId, email: profile.email });
      setSessionCookie(c, token);
      return c.redirect(`${origin}/auth?google=success`, 302);
    } catch (err) {
      console.error("[auth] Google callback failed:", err instanceof Error ? err.message : err);
      return c.redirect(failure, 302);
    }
  });

  app.route("/auth", auth);
};
