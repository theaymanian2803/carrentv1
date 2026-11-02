import { SignJWT, jwtVerify } from "jose";
import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "./env";
import { db } from "./db";

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

export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const token = bearerToken(c.req.header("Authorization"));
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
  const token = bearerToken(c.req.header("Authorization"));
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
