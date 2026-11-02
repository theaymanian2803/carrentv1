import { SignJWT, jwtVerify } from "jose";
import type { Context, MiddlewareHandler } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { AppEnv } from "./env";
import { db } from "./db";

export const SESSION_COOKIE = "carshare_session";
const SESSION_MAX_AGE = 30 * 24 * 60 * 60;

const SECRET = (secret: string): Uint8Array => new TextEncoder().encode(secret);

export const signToken = async (
  env: AppEnv["Bindings"],
  user: { id: string; email: string }
): Promise<string> =>
  new SignJWT({ email: user.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(SECRET(env.AUTH_SECRET));

export const verifyToken = async (token: string, secret: string) => {
  const { payload } = await jwtVerify(token, SECRET(secret), { algorithms: ["HS256"] });
  return payload;
};

const bearerToken = (header: string | undefined): string => {
  if (!header || !header.startsWith("Bearer ")) return "";
  return header.slice(7).trim();
};

const requestToken = (c: Context<AppEnv>): string => {
  const bearer = bearerToken(c.req.header("Authorization"));
  if (bearer) return bearer;
  return getCookie(c, SESSION_COOKIE) ?? "";
};

export const setSessionCookie = (c: Context<AppEnv>, token: string): void => {
  setCookie(c, SESSION_COOKIE, token, {
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
    secure: new URL(c.req.url).protocol === "https:",
    maxAge: SESSION_MAX_AGE,
  });
};

export const clearSessionCookie = (c: Context<AppEnv>): void => {
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
};

export const currentUserId = async (c: Context<AppEnv>): Promise<string | null> => {
  const token = requestToken(c);
  if (!token) return null;
  try {
    const payload = await verifyToken(token, c.env.AUTH_SECRET);
    return payload.sub ? String(payload.sub) : null;
  } catch {
    return null;
  }
};

export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const token = requestToken(c);
  if (!token) return c.json({ error: "Unauthorized" }, 401);
  try {
    const payload = await verifyToken(token, c.env.AUTH_SECRET);
    if (!payload.sub) return c.json({ error: "Unauthorized" }, 401);
    c.set("userId", String(payload.sub));
    await next();
  } catch {
    return c.json({ error: "Unauthorized" }, 401);
  }
};

export const optionalAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const token = requestToken(c);
  if (token) {
    try {
      const payload = await verifyToken(token, c.env.AUTH_SECRET);
      if (payload.sub) c.set("userId", String(payload.sub));
    } catch {
      // Anonymous request; detail routes decide what non-owners may see.
    }
  }
  await next();
};

export const requireAdmin: MiddlewareHandler<AppEnv> = async (c, next) => {
  const { rows } = await db(c.env).execute({
    sql: "SELECT 1 FROM user_roles WHERE user_id = ? AND role = 'admin'",
    args: [c.get("userId")],
  });
  if (!rows.length) return c.json({ error: "Forbidden" }, 403);
  await next();
};
