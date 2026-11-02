import type { Hono } from "hono";
import type { AppEnv } from "../../env";
import { db } from "../../db";
import { computeBooking } from "../../lib/booking";
import { parseJson, type Row } from "../../lib/serialize";

const now = (): string => new Date().toISOString();
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const STATUSES = new Set(["pending", "approved", "active", "completed", "cancelled", "disputed"]);

const readJson = async <T>(c: { req: { json: () => Promise<unknown> } }): Promise<T | null> => {
  try {
    return (await c.req.json()) as T;
  } catch {
    return null;
  }
};

const BOOKING_SELECT = `
  SELECT b.*,
    c.make AS car_make, c.model AS car_model, c.year AS car_year,
    c.images AS car_images, c.address AS car_address, c.daily_rate AS car_daily_rate,
    p.full_name AS renter_full_name, p.avatar_url AS renter_avatar_url
  FROM bookings b
  JOIN cars c ON c.id = b.car_id
  LEFT JOIN profiles p ON p.user_id = b.renter_id
`;

const mapBooking = (row: Row) => ({
  ...row,
  car: {
    id: String(row.car_id),
    make: String(row.car_make),
    model: String(row.car_model),
    year: Number(row.car_year),
    images: parseJson<string[]>(row.car_images, []),
    address: String(row.car_address ?? ""),
    daily_rate: Number(row.car_daily_rate),
  },
  renter: {
    id: String(row.renter_id),
    full_name: row.renter_full_name === null || row.renter_full_name === undefined ? null : String(row.renter_full_name),
    avatar_url:
      row.renter_avatar_url === null || row.renter_avatar_url === undefined
        ? null
        : String(row.renter_avatar_url),
  },
});

const isAdmin = async (env: AppEnv["Bindings"], userId: string): Promise<boolean> => {
  const { rows } = await db(env).execute({
    sql: "SELECT 1 FROM user_roles WHERE user_id = ? AND role = 'admin'",
    args: [userId],
  });
  return rows.length > 0;
};

export const bookingRoutes = (app: Hono<AppEnv>): void => {
  app.get("/bookings", async (c) => {
    const userId = c.get("userId");
    const d = db(c.env);
    const [asRenter, asOwner] = await Promise.all([
      d.execute({
        sql: `${BOOKING_SELECT} WHERE b.renter_id = ? ORDER BY b.created_at DESC`,
        args: [userId],
      }),
      d.execute({
        sql: `${BOOKING_SELECT} WHERE c.owner_id = ? ORDER BY b.created_at DESC`,
        args: [userId],
      }),
    ]);
    return c.json({
      asRenter: asRenter.rows.map((row) => mapBooking(row as Row)),
      asOwner: asOwner.rows.map((row) => mapBooking(row as Row)),
    });
  });

  app.post("/bookings", async (c) => {
    const body = await readJson<{
      car_id?: string;
      start_date?: string;
      end_date?: string;
      renter_phone?: string;
      renter_email?: string;
      renter_notes?: string;
    }>(c);
    if (!body) return c.json({ error: "Invalid JSON body" }, 400);

    const { car_id, start_date, end_date } = body;
    if (!car_id || !start_date || !end_date) {
      return c.json({ error: "car_id, start_date, and end_date are required" }, 400);
    }
    if (!DATE_RE.test(start_date) || !DATE_RE.test(end_date)) {
      return c.json({ error: "Dates must be YYYY-MM-DD" }, 400);
    }
    if (end_date <= start_date) return c.json({ error: "end_date must be after start_date" }, 400);

    const { rows: carRows } = await db(c.env).execute({
      sql: "SELECT id, owner_id, daily_rate, status, is_active FROM cars WHERE id = ?",
      args: [car_id],
    });
    if (!carRows.length) return c.json({ error: "Car not found" }, 404);
    const car = carRows[0];
    if (car.status !== "live" || !car.is_active) {
      return c.json({ error: "This car is not available" }, 409);
    }

    const userId = c.get("userId");
    if (String(car.owner_id) === userId) return c.json({ error: "You cannot book your own car" }, 400);

    const overlap = await db(c.env).execute({
      sql: `SELECT 1 FROM bookings
            WHERE car_id = ? AND status <> 'cancelled'
              AND start_date <= ? AND end_date >= ?`,
      args: [car_id, end_date, start_date],
    });
    if (overlap.rows.length) return c.json({ error: "Those dates are already booked" }, 409);

    const money = computeBooking({
      dailyRate: Number(car.daily_rate),
      startDate: start_date,
      endDate: end_date,
    });
    const id = crypto.randomUUID();
    await db(c.env).execute({
      sql: `INSERT INTO bookings (id, car_id, renter_id, start_date, end_date, total_days,
              platform_fee, owner_payout, total_price, status, renter_phone, renter_email, renter_notes,
              created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)`,
      args: [
        id,
        car_id,
        userId,
        start_date,
        end_date,
        money.totalDays,
        money.platformFee,
        money.ownerPayout,
        money.totalPrice,
        body.renter_phone ?? "",
        body.renter_email ?? "",
        body.renter_notes ?? "",
        now(),
        now(),
      ],
    });

    return c.json({ id, ...money, status: "pending" }, 201);
  });

  app.patch("/bookings/:id/status", async (c) => {
    const body = await readJson<{ status?: string }>(c);
    const status = body?.status;
    if (!status || !STATUSES.has(status)) return c.json({ error: "Invalid status" }, 400);

    const { rows } = await db(c.env).execute({
      sql: "SELECT b.id, b.status, b.renter_id, c.owner_id FROM bookings b JOIN cars c ON c.id = b.car_id WHERE b.id = ?",
      args: [c.req.param("id")],
    });
    if (!rows.length) return c.json({ error: "Not found" }, 404);
    const booking = rows[0];
    const current = String(booking.status);
    const userId = c.get("userId");
    const admin = await isAdmin(c.env, userId);
    const owner = String(booking.owner_id) === userId;
    const renter = String(booking.renter_id) === userId;

    let allowed = false;
    if (admin) allowed = true;
    else if (owner) {
      allowed =
        (current === "pending" && (status === "approved" || status === "cancelled")) ||
        (current === "approved" && (status === "active" || status === "cancelled"));
    } else if (renter) {
      allowed =
        (current === "pending" || current === "approved") && status === "cancelled";
    }

    if (!allowed) return c.json({ error: "Transition not allowed" }, 403);
    if (current === status) return c.json({ error: "Booking is already in that state" }, 409);

    await db(c.env).execute({
      sql: "UPDATE bookings SET status = ?, updated_at = ? WHERE id = ?",
      args: [status, now(), String(booking.id)],
    });
    return c.json({ id: String(booking.id), status });
  });
};
