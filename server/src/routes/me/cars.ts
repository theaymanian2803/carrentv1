import type { Hono } from "hono";
import type { AppEnv } from "../../env";
import { db } from "../../db";
import { CAR_SELECT, mapCar, type Row } from "../../lib/serialize";

const now = (): string => new Date().toISOString();
const CATEGORIES = new Set(["SUV", "Sedan", "Luxury", "Electric"]);

const readJson = async <T>(c: { req: { json: () => Promise<unknown> } }): Promise<T | null> => {
  try {
    return (await c.req.json()) as T;
  } catch {
    return null;
  }
};

interface CarBody {
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
  is_active?: boolean;
}

const listingLimit = async (env: AppEnv["Bindings"], userId: string): Promise<number> => {
  const { rows } = await db(env).execute({
    sql: "SELECT plan, status FROM subscriptions WHERE user_id = ?",
    args: [userId],
  });
  return rows.length && rows[0].plan === "pro" && rows[0].status === "active" ? 15 : 3;
};

const countCars = async (env: AppEnv["Bindings"], userId: string): Promise<number> => {
  const { rows } = await db(env).execute({
    sql: "SELECT COUNT(*) AS n FROM cars WHERE owner_id = ?",
    args: [userId],
  });
  return Number(rows[0].n);
};

const ownedCar = async (env: AppEnv["Bindings"], userId: string, carId: string) => {
  const { rows } = await db(env).execute({
    sql: "SELECT id, owner_id FROM cars WHERE id = ?",
    args: [carId],
  });
  if (!rows.length || String(rows[0].owner_id) !== userId) return null;
  return rows[0];
};

export const carRoutes = (app: Hono<AppEnv>): void => {
  app.get("/cars", async (c) => {
    const { rows } = await db(c.env).execute({
      sql: `${CAR_SELECT} WHERE c.owner_id = ? ORDER BY c.created_at DESC`,
      args: [c.get("userId")],
    });
    return c.json(rows.map((row) => mapCar(row as Row)));
  });

  app.post("/cars", async (c) => {
    const body = await readJson<CarBody>(c);
    if (!body) return c.json({ error: "Invalid JSON body" }, 400);

    if (!body.make || !body.model || !body.year || !body.category || !body.address) {
      return c.json({ error: "make, model, year, category, and address are required" }, 400);
    }
    if (!CATEGORIES.has(body.category)) return c.json({ error: "Invalid category" }, 400);
    if (typeof body.daily_rate !== "number" || body.daily_rate <= 0) {
      return c.json({ error: "daily_rate must be a positive number" }, 400);
    }

    const userId = c.get("userId");
    const limit = await listingLimit(c.env, userId);
    if ((await countCars(c.env, userId)) >= limit) {
      return c.json({ error: "Listing limit reached" }, 403);
    }

    const id = crypto.randomUUID();
    await db(c.env).execute({
      sql: `INSERT INTO cars (id, owner_id, make, model, year, category, daily_rate, location_lat, location_lng,
              address, description, features, images, is_active, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'pending_approval', ?, ?)`,
      args: [
        id,
        userId,
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
        now(),
        now(),
      ],
    });

    const { rows } = await db(c.env).execute({ sql: `${CAR_SELECT} WHERE c.id = ?`, args: [id] });
    return c.json(mapCar(rows[0] as Row), 201);
  });

  app.put("/cars/:id", async (c) => {
    const userId = c.get("userId");
    const carId = c.req.param("id");
    if (!(await ownedCar(c.env, userId, carId))) return c.json({ error: "Not found" }, 404);

    const body = await readJson<CarBody>(c);
    if (!body) return c.json({ error: "Invalid JSON body" }, 400);

    const sets: string[] = [];
    const args: unknown[] = [];
    const setIf = (column: string, value: unknown) => {
      if (value === undefined) return;
      sets.push(`${column} = ?`);
      args.push(value);
    };

    setIf("make", body.make);
    setIf("model", body.model);
    setIf("year", body.year);
    setIf("category", body.category);
    setIf("daily_rate", body.daily_rate);
    setIf("location_lat", body.location_lat);
    setIf("location_lng", body.location_lng);
    setIf("address", body.address);
    setIf("description", body.description);
    setIf("features", body.features === undefined ? undefined : JSON.stringify(body.features));
    setIf("images", body.images === undefined ? undefined : JSON.stringify(body.images));
    setIf("is_active", body.is_active === undefined ? undefined : body.is_active ? 1 : 0);

    if (!sets.length) return c.json({ error: "Nothing to update" }, 400);
    sets.push("updated_at = ?");
    args.push(now(), carId);

    await db(c.env).execute({
      sql: `UPDATE cars SET ${sets.join(", ")} WHERE id = ?`,
      args: args as never[],
    });
    const { rows } = await db(c.env).execute({ sql: `${CAR_SELECT} WHERE c.id = ?`, args: [carId] });
    return c.json(mapCar(rows[0] as Row));
  });

  app.delete("/cars/:id", async (c) => {
    const userId = c.get("userId");
    const carId = c.req.param("id");
    if (!(await ownedCar(c.env, userId, carId))) return c.json({ error: "Not found" }, 404);
    await db(c.env).execute({ sql: "DELETE FROM cars WHERE id = ?", args: [carId] });
    return c.body(null, 204);
  });
};
