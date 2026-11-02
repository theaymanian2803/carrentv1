import type { Hono } from "hono";
import type { AppEnv } from "../../env";
import { db } from "../../db";
import { BOOKING_SELECT, mapBooking, type Row } from "../../lib/bookings";

const now = (): string => new Date().toISOString();
const STATUSES = new Set(["pending", "approved", "active", "completed", "cancelled", "disputed"]);

const readJson = async <T>(c: { req: { json: () => Promise<unknown> } }): Promise<T | null> => {
  try {
    return (await c.req.json()) as T;
  } catch {
    return null;
  }
};

export const adminBookingRoutes = (app: Hono<AppEnv>): void => {
  app.get("/bookings", async (c) => {
    const { rows } = await db(c.env).execute(
      `${BOOKING_SELECT} ORDER BY b.created_at DESC`
    );
    return c.json(rows.map((row) => mapBooking(row as Row, { includeContact: true })));
  });

  app.patch("/bookings/:id/status", async (c) => {
    const body = await readJson<{ status?: string }>(c);
    if (!body?.status || !STATUSES.has(body.status)) {
      return c.json({ error: "Invalid status" }, 400);
    }
    const result = await db(c.env).execute({
      sql: "UPDATE bookings SET status = ?, updated_at = ? WHERE id = ?",
      args: [body.status, now(), c.req.param("id")],
    });
    if (!result.rowsAffected) return c.json({ error: "Not found" }, 404);
    return c.json({ id: c.req.param("id"), status: body.status });
  });

  app.delete("/bookings/:id", async (c) => {
    const result = await db(c.env).execute({
      sql: "DELETE FROM bookings WHERE id = ?",
      args: [c.req.param("id")],
    });
    if (!result.rowsAffected) return c.json({ error: "Not found" }, 404);
    return c.body(null, 204);
  });
};
