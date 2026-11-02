import { describe, it, expect } from "vitest";
import app from "../src/index";
import { makeTestEnv, resetSchema, call, seedUser, authHeaders } from "./helpers";
import { db } from "../src/db";
import { computeBooking } from "../src/lib/booking";
import type { Env } from "../src/env";

const now = (): string => new Date().toISOString();

const seedCar = async (env: Env, ownerId: string, status = "live"): Promise<string> => {
  const id = crypto.randomUUID();
  await db(env).execute({
    sql: `INSERT INTO cars (id, owner_id, make, model, year, category, daily_rate, address, description, features, images, is_active, status, created_at, updated_at)
          VALUES (?, ?, 'Tesla', 'Model 3', 2023, 'Electric', 100, 'Montréal, QC', 'Nice', '{}', '[]', 1, ?, ?, ?)`,
    args: [id, ownerId, status, now(), now()],
  });
  return id;
};

const book = async (env: Env, headers: Record<string, string>, body: Record<string, unknown>) =>
  call(app, env, "/api/me/bookings", {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

describe("computeBooking", () => {
  it("computes days, total, and zero platform fee", () => {
    expect(computeBooking({ dailyRate: 100, startDate: "2026-01-01", endDate: "2026-01-04" })).toEqual({
      totalDays: 3,
      totalPrice: 300,
      platformFee: 0,
      ownerPayout: 300,
    });
  });
});

describe("bookings", () => {
  it("ignores client-authored money and stores server-computed totals", async () => {
    const env = await makeTestEnv();
    await resetSchema(env);
    const ownerId = await seedUser(env, "owner@example.com");
    const renterId = await seedUser(env, "renter@example.com", "renter");
    const carId = await seedCar(env, ownerId);
    const headers = await authHeaders(env, renterId);

    const res = await book(env, headers, {
      car_id: carId,
      start_date: "2026-01-01",
      end_date: "2026-01-04",
      total_price: 1,
      platform_fee: 1,
      owner_payout: 1,
      total_days: 99,
    });
    expect(res.status).toBe(201);

    const { rows } = await db(env).execute({ sql: "SELECT * FROM bookings", args: [] });
    expect(Number(rows[0].total_price)).toBe(300);
    expect(Number(rows[0].platform_fee)).toBe(0);
    expect(Number(rows[0].owner_payout)).toBe(300);
    expect(Number(rows[0].total_days)).toBe(3);
  });

  it("rejects non-live cars, self-booking, bad dates, and overlaps", async () => {
    const env = await makeTestEnv();
    await resetSchema(env);
    const ownerId = await seedUser(env, "owner@example.com");
    const renterId = await seedUser(env, "renter@example.com", "renter");
    const ownerHeaders = await authHeaders(env, ownerId);
    const renterHeaders = await authHeaders(env, renterId);
    const liveCar = await seedCar(env, ownerId);
    const pendingCar = await seedCar(env, ownerId, "pending_approval");

    expect(
      (
        await book(env, renterHeaders, {
          car_id: pendingCar,
          start_date: "2026-02-01",
          end_date: "2026-02-03",
        })
      ).status
    ).toBe(409);

    expect(
      (
        await book(env, ownerHeaders, {
          car_id: liveCar,
          start_date: "2026-02-01",
          end_date: "2026-02-03",
        })
      ).status
    ).toBe(400);

    expect(
      (
        await book(env, renterHeaders, {
          car_id: liveCar,
          start_date: "2026-02-03",
          end_date: "2026-02-02",
        })
      ).status
    ).toBe(400);

    expect(
      (
        await book(env, renterHeaders, {
          car_id: liveCar,
          start_date: "2026-02-10",
          end_date: "2026-02-10",
        })
      ).status
    ).toBe(201);

    expect(
      (
        await book(env, renterHeaders, {
          car_id: liveCar,
          start_date: "2026-02-01",
          end_date: "2026-02-03",
        })
      ).status
    ).toBe(201);

    expect(
      (
        await book(env, renterHeaders, {
          car_id: liveCar,
          start_date: "2026-02-02",
          end_date: "2026-02-04",
        })
      ).status
    ).toBe(409);
  });

  it("returns renter and owner projections with their joins", async () => {
    const env = await makeTestEnv();
    await resetSchema(env);
    const ownerId = await seedUser(env, "owner@example.com");
    const renterId = await seedUser(env, "renter@example.com", "renter");
    const carId = await seedCar(env, ownerId);
    const renterHeaders = await authHeaders(env, renterId);
    const ownerHeaders = await authHeaders(env, ownerId);
    await book(env, renterHeaders, {
      car_id: carId,
      start_date: "2026-03-01",
      end_date: "2026-03-03",
      renter_phone: "555-0100",
      renter_email: "renter@example.com",
    });

    const asRenter = (await (
      await call(app, env, "/api/me/bookings", { headers: renterHeaders })
    ).json()) as any;
    expect(asRenter.asRenter).toHaveLength(1);
    expect(asRenter.asRenter[0].car.make).toBe("Tesla");
    expect(asRenter.asRenter[0].renter.email).toBe("renter@example.com");

    const asOwner = (await (
      await call(app, env, "/api/me/bookings", { headers: ownerHeaders })
    ).json()) as any;
    expect(asOwner.asOwner).toHaveLength(1);
    expect(asOwner.asOwner[0].renter.full_name).toBe("renter");
    expect(asOwner.asOwner[0].renter.email).toBeUndefined();
    expect(asOwner.asOwner[0].renter.phone).toBeUndefined();
    expect(asOwner.asOwner[0].renter_email).toBeUndefined();
    expect(asOwner.asOwner[0].renter_phone).toBeUndefined();
  });

  it("enforces the status transition matrix", async () => {
    const env = await makeTestEnv();
    await resetSchema(env);
    const ownerId = await seedUser(env, "owner@example.com");
    const renterId = await seedUser(env, "renter@example.com", "renter");
    const adminId = await seedUser(env, "admin@example.com", "admin");
    const carId = await seedCar(env, ownerId);
    const ownerHeaders = await authHeaders(env, ownerId);
    const renterHeaders = await authHeaders(env, renterId);
    const adminHeaders = await authHeaders(env, adminId);

    const makeBooking = async (start = "2026-04-01", end = "2026-04-03") => {
      const res = await book(env, renterHeaders, {
        car_id: carId,
        start_date: start,
        end_date: end,
      });
      return ((await res.json()) as any).id as string;
    };

    const first = await makeBooking("2026-04-01", "2026-04-03");
    expect(
      (
        await call(app, env, `/api/me/bookings/${first}/status`, {
          method: "PATCH",
          headers: { ...ownerHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({ status: "approved" }),
        })
      ).status
    ).toBe(200);

    const second = await makeBooking("2026-05-01", "2026-05-03");
    expect(
      (
        await call(app, env, `/api/me/bookings/${second}/status`, {
          method: "PATCH",
          headers: { ...renterHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({ status: "approved" }),
        })
      ).status
    ).toBe(403);

    expect(
      (
        await call(app, env, `/api/me/bookings/${second}/status`, {
          method: "PATCH",
          headers: { ...ownerHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({ status: "completed" }),
        })
      ).status
    ).toBe(403);

    expect(
      (
        await call(app, env, `/api/me/bookings/${second}/status`, {
          method: "PATCH",
          headers: { ...adminHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({ status: "completed" }),
        })
      ).status
    ).toBe(200);

    const third = await makeBooking("2026-06-01", "2026-06-03");
    expect(
      (
        await call(app, env, `/api/me/bookings/${third}/status`, {
          method: "PATCH",
          headers: { ...renterHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({ status: "cancelled" }),
        })
      ).status
    ).toBe(200);
  });

  it("allows only one of two concurrent requests for the same dates", async () => {
    const env = await makeTestEnv();
    await resetSchema(env);
    const ownerId = await seedUser(env, "owner@example.com");
    const renterId = await seedUser(env, "renter@example.com", "renter");
    const carId = await seedCar(env, ownerId);
    const headers = await authHeaders(env, renterId);
    const payload = {
      car_id: carId,
      start_date: "2026-07-01",
      end_date: "2026-07-04",
    };

    const results = await Promise.all([book(env, headers, payload), book(env, headers, payload)]);
    const statuses = results.map((res) => res.status).sort();
    expect(statuses).toEqual([201, 409]);

    const { rows } = await db(env).execute({
      sql: "SELECT COUNT(*) AS n FROM bookings",
      args: [],
    });
    expect(Number(rows[0].n)).toBe(1);
  });
});
