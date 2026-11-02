import { describe, it, expect } from "vitest";
import app from "../src/index";
import { makeTestEnv, resetSchema, call, seedUser, authHeaders } from "./helpers";
import { db } from "../src/db";
import type { Env } from "../src/env";

const now = (): string => new Date().toISOString();

const insertCar = async (
  env: Env,
  ownerId: string,
  status: "pending_approval" | "live" | "delisted",
  isActive: 0 | 1,
  make = "Tesla"
): Promise<string> => {
  const id = crypto.randomUUID();
  await db(env).execute({
    sql: `INSERT INTO cars (id, owner_id, make, model, year, category, daily_rate, address, description, features, images, is_active, status, created_at, updated_at)
          VALUES (?, ?, ?, 'Model 3', 2023, 'Electric', 89, 'Montréal, QC', 'Nice car', '{"GPS":true}', '["https://img/1.jpg"]', ?, ?, ?, ?)`,
    args: [id, ownerId, make, isActive, status, now(), now()],
  });
  return id;
};

describe("catalog", () => {
  it("lists only live and active cars", async () => {
    const env = await makeTestEnv();
    await resetSchema(env);
    const ownerId = await seedUser(env, "owner@example.com");
    await insertCar(env, ownerId, "live", 1, "Live");
    await insertCar(env, ownerId, "live", 0, "Inactive");
    await insertCar(env, ownerId, "pending_approval", 1, "Pending");

    const res = await call(app, env, "/api/cars");
    expect(res.status).toBe(200);
    const cars = (await res.json()) as any[];
    expect(cars).toHaveLength(1);
    expect(cars[0].make).toBe("Live");
    expect(cars[0].images).toEqual(["https://img/1.jpg"]);
    expect(cars[0].features).toEqual({ GPS: true });
  });

  it("hides a pending car from anonymous users but shows it to its owner", async () => {
    const env = await makeTestEnv();
    await resetSchema(env);
    const ownerId = await seedUser(env, "owner@example.com");
    const carId = await insertCar(env, ownerId, "pending_approval", 1);

    const anonymous = await call(app, env, `/api/cars/${carId}`);
    expect(anonymous.status).toBe(404);

    const owner = await call(app, env, `/api/cars/${carId}`, {
      headers: await authHeaders(env, ownerId, "owner@example.com"),
    });
    expect(owner.status).toBe(200);
  });

  it("embeds a safe owner summary without email or phone", async () => {
    const env = await makeTestEnv();
    await resetSchema(env);
    const ownerId = await seedUser(env, "secret-owner@example.com");
    const carId = await insertCar(env, ownerId, "live", 1);

    const res = await call(app, env, `/api/cars/${carId}`);
    expect(res.status).toBe(200);
    const car = (await res.json()) as any;
    expect(car.owner.full_name).toBe("secret-owner");
    expect(car.owner.rating_avg).toBe(0);
    expect(car.owner.review_count).toBe(0);
    expect(car.owner.email).toBeUndefined();
    expect(JSON.stringify(car)).not.toContain("secret-owner@example.com");
  });

  it("returns only visible landing sections ordered by sort_order", async () => {
    const env = await makeTestEnv();
    await resetSchema(env);
    const d = db(env);
    await d.batch([
      {
        sql: `INSERT INTO landing_sections (id, section_type, title, content, sort_order, is_visible, created_at, updated_at)
              VALUES (?, 'products', 'Second', '{}', 2, 1, ?, ?)`,
        args: [crypto.randomUUID(), now(), now()],
      },
      {
        sql: `INSERT INTO landing_sections (id, section_type, title, content, sort_order, is_visible, created_at, updated_at)
              VALUES (?, 'hero', 'First', '{}', 1, 1, ?, ?)`,
        args: [crypto.randomUUID(), now(), now()],
      },
      {
        sql: `INSERT INTO landing_sections (id, section_type, title, content, sort_order, is_visible, created_at, updated_at)
              VALUES (?, 'banner', 'Hidden', '{}', 0, 0, ?, ?)`,
        args: [crypto.randomUUID(), now(), now()],
      },
    ]);

    const res = await call(app, env, "/api/landing-sections");
    const sections = (await res.json()) as any[];
    expect(sections.map((s) => s.title)).toEqual(["First", "Second"]);
  });
});
