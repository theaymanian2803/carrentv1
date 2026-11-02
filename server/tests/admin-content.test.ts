import { describe, it, expect } from "vitest";
import app from "../src/index";
import { makeTestEnv, resetSchema, call, seedUser, authHeaders } from "./helpers";
import { db } from "../src/db";
import type { Env } from "../src/env";

const now = (): string => new Date().toISOString();

const carBody = (overrides: Record<string, unknown> = {}) => ({
  make: "Tesla",
  model: "Model 3",
  year: 2023,
  category: "Electric",
  daily_rate: 89,
  address: "Montréal, QC",
  ...overrides,
});

const seedCar = async (env: Env, ownerId: string, status = "live"): Promise<string> => {
  const id = crypto.randomUUID();
  await db(env).execute({
    sql: `INSERT INTO cars (id, owner_id, make, model, year, category, daily_rate, address, features, images, is_active, status, created_at, updated_at)
          VALUES (?, ?, 'Tesla', 'Model 3', 2023, 'Electric', 100, 'MTL', '{}', '[]', 1, ?, ?, ?)`,
    args: [id, ownerId, status, now(), now()],
  });
  return id;
};

const patchStatus = (env: Env, headers: Record<string, string>, carId: string, status: string) =>
  call(app, env, `/api/admin/cars/${carId}/status`, {
    method: "PATCH",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });

describe("admin cars", () => {
  it("creates a live car and bypasses the listing cap", async () => {
    const env = await makeTestEnv();
    await resetSchema(env);
    const adminId = await seedUser(env, "admin@example.com", "admin");
    const ownerId = await seedUser(env, "owner@example.com");
    const headers = await authHeaders(env, adminId);
    for (let i = 0; i < 3; i++) await seedCar(env, ownerId);

    const res = await call(app, env, "/api/admin/cars", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ ...carBody(), owner_id: ownerId, status: "live" }),
    });
    expect(res.status).toBe(201);
    const car = (await res.json()) as any;
    expect(car.status).toBe("live");
    expect(car.is_active).toBe(true);
  });

  it("keeps is_active in sync with the status", async () => {
    const env = await makeTestEnv();
    await resetSchema(env);
    const adminId = await seedUser(env, "admin@example.com", "admin");
    const ownerId = await seedUser(env, "owner@example.com");
    const headers = await authHeaders(env, adminId);
    const carId = await seedCar(env, ownerId);

    expect((await patchStatus(env, headers, carId, "delisted")).status).toBe(200);
    let row = await db(env).execute({ sql: "SELECT is_active FROM cars WHERE id = ?", args: [carId] });
    expect(Number(row.rows[0].is_active)).toBe(0);

    expect((await patchStatus(env, headers, carId, "live")).status).toBe(200);
    row = await db(env).execute({ sql: "SELECT is_active FROM cars WHERE id = ?", args: [carId] });
    expect(Number(row.rows[0].is_active)).toBe(1);
  });

  it("deletes a car and its bookings", async () => {
    const env = await makeTestEnv();
    await resetSchema(env);
    const adminId = await seedUser(env, "admin@example.com", "admin");
    const ownerId = await seedUser(env, "owner@example.com");
    const renterId = await seedUser(env, "renter@example.com", "renter");
    const carId = await seedCar(env, ownerId);
    await db(env).execute({
      sql: `INSERT INTO bookings (id, car_id, renter_id, start_date, end_date, total_days, total_price, status, created_at, updated_at)
            VALUES (?, ?, ?, '2026-01-01', '2026-01-03', 2, 200, 'pending', ?, ?)`,
      args: [crypto.randomUUID(), carId, renterId, now(), now()],
    });

    const res = await call(app, env, `/api/admin/cars/${carId}`, {
      method: "DELETE",
      headers: await authHeaders(env, adminId),
    });
    expect(res.status).toBe(204);
    const bookings = await db(env).execute({ sql: "SELECT 1 FROM bookings WHERE car_id = ?", args: [carId] });
    expect(bookings.rows).toHaveLength(0);
  });
});

describe("admin bookings", () => {
  it("lists renter contact details and allows any status", async () => {
    const env = await makeTestEnv();
    await resetSchema(env);
    const adminId = await seedUser(env, "admin@example.com", "admin");
    const ownerId = await seedUser(env, "owner@example.com");
    const renterId = await seedUser(env, "renter@example.com", "renter");
    const carId = await seedCar(env, ownerId);
    const bookingId = crypto.randomUUID();
    await db(env).execute({
      sql: `INSERT INTO bookings (id, car_id, renter_id, start_date, end_date, total_days, total_price, status, renter_email, renter_phone, created_at, updated_at)
            VALUES (?, ?, ?, '2026-01-01', '2026-01-03', 2, 200, 'pending', 'renter@example.com', '555-0100', ?, ?)`,
      args: [bookingId, carId, renterId, now(), now()],
    });
    const headers = await authHeaders(env, adminId);

    const list = (await (
      await call(app, env, "/api/admin/bookings", { headers })
    ).json()) as any[];
    expect(list).toHaveLength(1);
    expect(list[0].car.make).toBe("Tesla");
    expect(list[0].renter.email).toBe("renter@example.com");
    expect(list[0].renter.phone).toBe("555-0100");

    const patch = await call(app, env, `/api/admin/bookings/${bookingId}/status`, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    });
    expect(patch.status).toBe(200);

    const invalid = await call(app, env, `/api/admin/bookings/${bookingId}/status`, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ status: "nonsense" }),
    });
    expect(invalid.status).toBe(400);
  });
});

describe("admin subscriptions", () => {
  it("sets the pro period and clears it on free", async () => {
    const env = await makeTestEnv();
    await resetSchema(env);
    const adminId = await seedUser(env, "admin@example.com", "admin");
    const ownerId = await seedUser(env, "owner@example.com");
    const headers = await authHeaders(env, adminId);
    const { rows } = await db(env).execute({
      sql: "SELECT id FROM subscriptions WHERE user_id = ?",
      args: [ownerId],
    });
    const subId = String(rows[0].id);

    const pro = await call(app, env, `/api/admin/subscriptions/${subId}`, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ plan: "pro", status: "active" }),
    });
    expect(pro.status).toBe(200);
    let row = await db(env).execute({
      sql: "SELECT plan, status, current_period_end FROM subscriptions WHERE id = ?",
      args: [subId],
    });
    expect(row.rows[0].plan).toBe("pro");
    expect(row.rows[0].current_period_end).toBeTruthy();

    const free = await call(app, env, `/api/admin/subscriptions/${subId}`, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ plan: "free", status: "active" }),
    });
    expect(free.status).toBe(200);
    row = await db(env).execute({
      sql: "SELECT plan, current_period_end FROM subscriptions WHERE id = ?",
      args: [subId],
    });
    expect(row.rows[0].plan).toBe("free");
    expect(row.rows[0].current_period_end).toBeNull();
  });
});
