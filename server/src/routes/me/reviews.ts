import type { Hono } from "hono";
import type { AppEnv } from "../../env";
import { db } from "../../db";

const now = (): string => new Date().toISOString();

const readJson = async <T>(c: { req: { json: () => Promise<unknown> } }): Promise<T | null> => {
  try {
    return (await c.req.json()) as T;
  } catch {
    return null;
  }
};

export const reviewRoutes = (app: Hono<AppEnv>): void => {
  app.get("/reviews", async (c) => {
    const { rows } = await db(c.env).execute({
      sql: "SELECT * FROM reviews WHERE reviewer_id = ? ORDER BY created_at DESC",
      args: [c.get("userId")],
    });
    return c.json(rows);
  });

  app.post("/reviews", async (c) => {
    const body = await readJson<{ booking_id?: string; rating?: number; comment?: string }>(c);
    if (!body) return c.json({ error: "Invalid JSON body" }, 400);

    const bookingId = body.booking_id;
    const rating = body.rating;
    if (!bookingId) return c.json({ error: "booking_id is required" }, 400);
    if (rating === undefined || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return c.json({ error: "rating must be an integer from 1 to 5" }, 400);
    }

    const userId = c.get("userId");
    const { rows } = await db(c.env).execute({
      sql: `SELECT b.renter_id, b.status, c.owner_id
            FROM bookings b JOIN cars c ON c.id = b.car_id
            WHERE b.id = ?`,
      args: [bookingId],
    });
    if (!rows.length) return c.json({ error: "Not found" }, 404);

    const booking = rows[0];
    if (String(booking.renter_id) !== userId) return c.json({ error: "Not found" }, 404);
    if (booking.status !== "completed") {
      return c.json({ error: "You can only review completed bookings" }, 409);
    }

    const id = crypto.randomUUID();
    try {
      await db(c.env).execute({
        sql: `INSERT INTO reviews (id, booking_id, reviewer_id, reviewee_id, rating, comment, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id,
          bookingId,
          userId,
          String(booking.owner_id),
          rating,
          body.comment ?? null,
          now(),
        ],
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.toLowerCase().includes("unique")) {
        return c.json({ error: "You already reviewed this booking" }, 409);
      }
      throw err;
    }

    return c.json(
      {
        id,
        booking_id: bookingId,
        reviewer_id: userId,
        reviewee_id: String(booking.owner_id),
        rating,
        comment: body.comment ?? null,
        created_at: now(),
      },
      201
    );
  });
};
