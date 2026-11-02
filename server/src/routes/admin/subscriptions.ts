import type { Hono } from "hono";
import type { AppEnv } from "../../env";
import { db } from "../../db";

const now = (): string => new Date().toISOString();
const PLANS = new Set(["free", "pro"]);
const STATUSES = new Set(["active", "cancelled", "past_due", "expired"]);

const readJson = async <T>(c: { req: { json: () => Promise<unknown> } }): Promise<T | null> => {
  try {
    return (await c.req.json()) as T;
  } catch {
    return null;
  }
};

export const adminSubscriptionRoutes = (app: Hono<AppEnv>): void => {
  app.get("/subscriptions", async (c) => {
    const { rows } = await db(c.env).execute(`
      SELECT s.*, p.full_name, u.email
      FROM subscriptions s
      LEFT JOIN profiles p ON p.user_id = s.user_id
      LEFT JOIN users u ON u.id = s.user_id
      ORDER BY s.created_at DESC
    `);
    return c.json(rows);
  });

  app.patch("/subscriptions/:id", async (c) => {
    const body = await readJson<{ plan?: string; status?: string }>(c);
    if (!body?.plan || !PLANS.has(body.plan)) return c.json({ error: "Invalid plan" }, 400);
    if (!body.status || !STATUSES.has(body.status)) {
      return c.json({ error: "Invalid status" }, 400);
    }

    const isPro = body.plan === "pro";
    const periodEnd = isPro
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      : null;
    const result = await db(c.env).execute({
      sql: `UPDATE subscriptions
            SET plan = ?, status = ?, current_period_start = ?, current_period_end = ?, updated_at = ?
            WHERE id = ?`,
      args: [body.plan, body.status, isPro ? now() : null, periodEnd, now(), c.req.param("id")],
    });
    if (!result.rowsAffected) return c.json({ error: "Not found" }, 404);
    return c.json({ id: c.req.param("id"), plan: body.plan, status: body.status });
  });
};
