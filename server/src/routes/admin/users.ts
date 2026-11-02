import type { Hono } from "hono";
import type { AppEnv } from "../../env";
import { db } from "../../db";

const ROLES = new Set(["admin", "owner", "renter"]);
const KYC = new Set(["pending", "verified", "rejected"]);

const readJson = async <T>(c: { req: { json: () => Promise<unknown> } }): Promise<T | null> => {
  try {
    return (await c.req.json()) as T;
  } catch {
    return null;
  }
};

export const adminUserRoutes = (app: Hono<AppEnv>): void => {
  app.get("/users", async (c) => {
    const d = db(c.env);
    const [userRes, roleRes] = await Promise.all([
      d.execute(`
        SELECT u.id, u.email, u.created_at,
               p.full_name, p.avatar_url, p.kyc_status,
               s.plan, s.status AS subscription_status
        FROM users u
        LEFT JOIN profiles p ON p.user_id = u.id
        LEFT JOIN subscriptions s ON s.user_id = u.id
        ORDER BY u.created_at DESC
      `),
      d.execute("SELECT user_id, role FROM user_roles"),
    ]);

    const rolesByUser = new Map<string, string[]>();
    for (const row of roleRes.rows) {
      const userId = String(row.user_id);
      rolesByUser.set(userId, [...(rolesByUser.get(userId) ?? []), String(row.role)]);
    }

    return c.json(
      userRes.rows.map((row) => ({
        id: String(row.id),
        email: String(row.email),
        full_name: row.full_name === null ? null : String(row.full_name),
        avatar_url: row.avatar_url === null ? null : String(row.avatar_url),
        kyc_status: row.kyc_status === null ? "pending" : String(row.kyc_status),
        plan: row.plan === null ? "free" : String(row.plan),
        status: row.subscription_status === null ? "active" : String(row.subscription_status),
        created_at: String(row.created_at),
        roles: rolesByUser.get(String(row.id)) ?? [],
      }))
    );
  });

  app.put("/users/:id/roles", async (c) => {
    const body = await readJson<{ roles?: unknown }>(c);
    const roles = body?.roles;
    if (!Array.isArray(roles) || roles.length === 0) {
      return c.json({ error: "roles must be a non-empty array" }, 400);
    }
    if (!roles.every((role) => typeof role === "string" && ROLES.has(role))) {
      return c.json({ error: "Invalid role" }, 400);
    }

    const userId = c.req.param("id");
    const d = db(c.env);
    const exists = await d.execute({ sql: "SELECT 1 FROM users WHERE id = ?", args: [userId] });
    if (!exists.rows.length) return c.json({ error: "Not found" }, 404);

    const current = await d.execute({
      sql: "SELECT role FROM user_roles WHERE user_id = ?",
      args: [userId],
    });
    const currentlyAdmin = current.rows.some((row) => row.role === "admin");
    const keepsAdmin = roles.includes("admin");

    if (currentlyAdmin && !keepsAdmin) {
      const admins = await d.execute("SELECT COUNT(*) AS n FROM user_roles WHERE role = 'admin'");
      if (Number(admins.rows[0].n) <= 1) {
        return c.json({ error: "Cannot remove the last admin" }, 409);
      }
    }

    const unique = [...new Set(roles as string[])];
    await d.batch([
      { sql: "DELETE FROM user_roles WHERE user_id = ?", args: [userId] },
      ...unique.map((role) => ({
        sql: "INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)",
        args: [crypto.randomUUID(), userId, role],
      })),
    ]);

    return c.json({ user_id: userId, roles: unique });
  });

  app.patch("/users/:id/kyc", async (c) => {
    const body = await readJson<{ status?: string }>(c);
    if (!body?.status || !KYC.has(body.status)) {
      return c.json({ error: "Invalid KYC status" }, 400);
    }
    const result = await db(c.env).execute({
      sql: "UPDATE profiles SET kyc_status = ?, updated_at = ? WHERE user_id = ?",
      args: [body.status, new Date().toISOString(), c.req.param("id")],
    });
    if (!result.rowsAffected) return c.json({ error: "Not found" }, 404);
    return c.json({ user_id: c.req.param("id"), kyc_status: body.status });
  });
};
