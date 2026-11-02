import { Hono } from "hono";
import type { AppEnv } from "../env";
import { db } from "../db";
import { requireAuth, signToken } from "../auth";
import { hashPassword, verifyPassword } from "../password";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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
      return c.json({ token, user: { id, email, fullName } }, 201);
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
      user: { id: String(user.id), email: String(user.email), fullName: user.name },
    });
  });

  auth.get("/me", requireAuth, async (c) => {
    const userId = c.get("userId");
    const d = db(c.env);
    const [userRes, profileRes, rolesRes] = await Promise.all([
      d.execute({ sql: "SELECT id, email, name FROM users WHERE id = ?", args: [userId] }),
      d.execute({ sql: "SELECT * FROM profiles WHERE user_id = ?", args: [userId] }),
      d.execute({ sql: "SELECT role FROM user_roles WHERE user_id = ?", args: [userId] }),
    ]);
    if (!userRes.rows.length) return c.json({ error: "Unauthorized" }, 401);
    return c.json({
      user: {
        id: String(userRes.rows[0].id),
        email: String(userRes.rows[0].email),
        fullName: userRes.rows[0].name,
      },
      profile: profileRes.rows[0] ?? null,
      roles: rolesRes.rows.map((r) => String(r.role)),
    });
  });

  app.route("/auth", auth);
};
