import type { Hono } from "hono";
import type { AppEnv } from "../../env";
import { db } from "../../db";
import { CAR_SELECT, mapCar, type Row } from "../../lib/serialize";

const now = (): string => new Date().toISOString();
const CATEGORIES = new Set(["SUV", "Sedan", "Luxury", "Electric"]);
const STATUSES = new Set(["pending_approval", "live", "delisted"]);

const readJson = async <T>(c: { req: { json: () => Promise<unknown> } }): Promise<T | null> => {
  try {
    return (await c.req.json()) as T;
  } catch {
    return null;
  }
};

interface AdminCarBody {
  owner_id?: string;
  make?: string;
  model?: string;
  year?: number;
  category?: string;
  daily_rate?: number;
  location_lat?: number | null;
  location_lng?: number | null;
  address?: string;
  description?: string | null;
  features?: Record<string, unknown>;
  images?: string[];
  status?: string;
}

export const adminCarRoutes = (app: Hono<AppEnv>): void => {
  app.get("/cars", async (c) => {
    const { rows } = await db(c.env).execute(`${CAR_SELECT} ORDER BY c.created_at DESC`);
    return c.json(rows.map((row) => mapCar(row as Row)));
  });

  app.post("/cars", async (c) => {
    const body = await readJson<AdminCarBody>(c);
    if (!body) return c.json({ error: "Invalid JSON body" }, 400);
    if (!body.make || !body.model || !body.year || !body.category || !body.address) {
      return c.json({ error: "make, model, year, category, and address are required" }, 400);
    }
    if (!CATEGORIES.has(body.category)) return c.json({ error: "Invalid category" }, 400);
    if (typeof body.daily_rate !== "number" || body.daily_rate <= 0) {
      return c.json({ error: "daily_rate must be a positive number" }, 400);
    }
    const status = body.status ?? "pending_approval";
    if (!STATUSES.has(status)) return c.json({ error: "Invalid status" }, 400);

    const ownerId = body.owner_id ?? c.get("userId");
    const owner = await db(c.env).execute({
      sql: "SELECT 1 FROM users WHERE id = ?",
      args: [ownerId],
    });
    if (!owner.rows.length) return c.json({ error: "owner_id does not exist" }, 400);

    const id = crypto.randomUUID();
    await db(c.env).execute({
      sql: `INSERT INTO cars (id, owner_id, make, model, year, category, daily_rate, location_lat, location_lng,
              address, description, features, images, is_active, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        ownerId,
        body.make,
        body.model,
        body.year,
        body.category,
        body.daily_rate,
        body.location_lat ?? null,
        body.location_lng ?? null,
        body.address,
        body.description ?? null,
        JSON.stringify(body.features ?? {}),
        JSON.stringify(body.images ?? []),
        status === "live" ? 1 : 0,
        status,
        now(),
        now(),
      ],
    });

    const { rows } = await db(c.env).execute({ sql: `${CAR_SELECT} WHERE c.id = ?`, args: [id] });
    return c.json(mapCar(rows[0] as Row), 201);
  });

  app.patch("/cars/:id/status", async (c) => {
    const body = await readJson<{ status?: string }>(c);
    if (!body?.status || !STATUSES.has(body.status)) {
      return c.json({ error: "Invalid status" }, 400);
    }
    const result = await db(c.env).execute({
      sql: "UPDATE cars SET status = ?, is_active = ?, updated_at = ? WHERE id = ?",
      args: [body.status, body.status === "live" ? 1 : 0, now(), c.req.param("id")],
    });
    if (!result.rowsAffected) return c.json({ error: "Not found" }, 404);
    return c.json({ id: c.req.param("id"), status: body.status });
  });

  app.delete("/cars/:id", async (c) => {
    const carId = c.req.param("id");
    const d = db(c.env);
    const exists = await d.execute({ sql: "SELECT 1 FROM cars WHERE id = ?", args: [carId] });
    if (!exists.rows.length) return c.json({ error: "Not found" }, 404);
    await d.batch([
      { sql: "DELETE FROM bookings WHERE car_id = ?", args: [carId] },
      { sql: "DELETE FROM cars WHERE id = ?", args: [carId] },
    ]);
    return c.body(null, 204);
  });
};
