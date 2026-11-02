import { describe, it, expect } from "vitest";
import app from "../src/index";
import { makeTestEnv, resetSchema, call, seedUser, authHeaders } from "./helpers";
import { db } from "../src/db";
import type { Env } from "../src/env";

const now = (): string => new Date().toISOString();

const seedBooking = async (
  env: Env,
  ownerId: string,
  renterId: string,
  status: "pending" | "completed"
): Promise<string> => {
  const carId = crypto.randomUUID();
  const bookingId = crypto.randomUUID();
  await db(env).batch([
    {
      sql: `INSERT INTO cars (id, owner_id, make, model, year, category, daily_rate, address, features, images, is_active, status, created_at, updated_at)
            VALUES (?, ?, 'Tesla', 'Model 3', 2023, 'Electric', 100, 'MTL', '{}', '[]', 1, 'live', ?, ?)`,
      args: [carId, ownerId, now(), now()],
    },
    {
      sql: `INSERT INTO bookings (id, car_id, renter_id, start_date, end_date, total_days, platform_fee, owner_payout, total_price, status, created_at, updated_at)
            VALUES (?, ?, ?, '2026-01-01', '2026-01-03', 2, 0, 200, 200, ?, ?, ?)`,
      args: [bookingId, carId, renterId, status, now(), now()],
    },
  ]);
  return bookingId;
};

const review = async (
  env: Env,
  headers: Record<string, string>,
  body: Record<string, unknown>
) =>
  call(app, env, "/api/me/reviews", {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

describe("reviews", () => {
  it("creates a review on a completed booking with the car owner as reviewee", async () => {
    const env = await makeTestEnv();
    await resetSchema(env);
    const ownerId = await seedUser(env, "owner@example.com");
    const renterId = await seedUser(env, "renter@example.com", "renter");
    const bookingId = await seedBooking(env, ownerId, renterId, "completed");
    const headers = await authHeaders(env, renterId);

    const res = await review(env, headers, { booking_id: bookingId, rating: 5, comment: "Great" });
    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.reviewee_id).toBe(ownerId);
    expect(body.reviewer_id).toBe(renterId);
  });

  it("rejects a booking that is not completed", async () => {
    const env = await makeTestEnv();
    await resetSchema(env);
    const ownerId = await seedUser(env, "owner@example.com");
    const renterId = await seedUser(env, "renter@example.com", "renter");
    const bookingId = await seedBooking(env, ownerId, renterId, "pending");
    const headers = await authHeaders(env, renterId);

    expect((await review(env, headers, { booking_id: bookingId, rating: 5 })).status).toBe(409);
  });

  it("rejects a booking that belongs to someone else", async () => {
    const env = await makeTestEnv();
    await resetSchema(env);
    const ownerId = await seedUser(env, "owner@example.com");
    const renterId = await seedUser(env, "renter@example.com", "renter");
    const strangerId = await seedUser(env, "stranger@example.com", "renter");
    const bookingId = await seedBooking(env, ownerId, renterId, "completed");
    const headers = await authHeaders(env, strangerId);

    expect((await review(env, headers, { booking_id: bookingId, rating: 5 })).status).toBe(404);
  });

  it("rejects a second review for the same booking", async () => {
    const env = await makeTestEnv();
    await resetSchema(env);
    const ownerId = await seedUser(env, "owner@example.com");
    const renterId = await seedUser(env, "renter@example.com", "renter");
    const bookingId = await seedBooking(env, ownerId, renterId, "completed");
    const headers = await authHeaders(env, renterId);

    expect((await review(env, headers, { booking_id: bookingId, rating: 5 })).status).toBe(201);
    expect((await review(env, headers, { booking_id: bookingId, rating: 4 })).status).toBe(409);
  });

  it("rejects a rating outside 1-5", async () => {
    const env = await makeTestEnv();
    await resetSchema(env);
    const ownerId = await seedUser(env, "owner@example.com");
    const renterId = await seedUser(env, "renter@example.com", "renter");
    const bookingId = await seedBooking(env, ownerId, renterId, "completed");
    const headers = await authHeaders(env, renterId);

    expect((await review(env, headers, { booking_id: bookingId, rating: 6 })).status).toBe(400);
  });
});
