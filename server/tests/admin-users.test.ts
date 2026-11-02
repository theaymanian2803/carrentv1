import { describe, it, expect } from "vitest";
import app from "../src/index";
import { makeTestEnv, resetSchema, call, seedUser, authHeaders } from "./helpers";
import { db } from "../src/db";
import type { Env } from "../src/env";

const now = (): string => new Date().toISOString();

const putRoles = async (
  env: Env,
  headers: Record<string, string>,
  userId: string,
  roles: string[]
) =>
  call(app, env, `/api/admin/users/${userId}/roles`, {
    method: "PUT",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ roles }),
  });

describe("admin users", () => {
  it("rejects non-admin callers", async () => {
    const env = await makeTestEnv();
    await resetSchema(env);
    const ownerId = await seedUser(env, "owner@example.com");
    const res = await call(app, env, "/api/admin/users", {
      headers: await authHeaders(env, ownerId),
    });
    expect(res.status).toBe(403);
  });

  it("lists users with roles and plan", async () => {
    const env = await makeTestEnv();
    await resetSchema(env);
    const adminId = await seedUser(env, "admin@example.com", "admin");
    await seedUser(env, "owner@example.com");
    const res = await call(app, env, "/api/admin/users", {
      headers: await authHeaders(env, adminId),
    });
    expect(res.status).toBe(200);
    const users = (await res.json()) as any[];
    expect(users).toHaveLength(2);
    const owner = users.find((u) => u.email === "owner@example.com");
    expect(owner.roles).toEqual(["owner"]);
    expect(owner.plan).toBe("free");
  });

  it("replaces the role set and rejects an empty one", async () => {
    const env = await makeTestEnv();
    await resetSchema(env);
    const adminId = await seedUser(env, "admin@example.com", "admin");
    const ownerId = await seedUser(env, "owner@example.com");
    const headers = await authHeaders(env, adminId);

    expect((await putRoles(env, headers, ownerId, ["owner", "renter"])).status).toBe(200);
    const roles = await db(env).execute({
      sql: "SELECT role FROM user_roles WHERE user_id = ? ORDER BY role",
      args: [ownerId],
    });
    expect(roles.rows.map((r) => r.role)).toEqual(["owner", "renter"]);

    expect((await putRoles(env, headers, ownerId, [])).status).toBe(400);
  });

  it("refuses to demote the last admin", async () => {
    const env = await makeTestEnv();
    await resetSchema(env);
    const adminId = await seedUser(env, "admin@example.com", "admin");
    const headers = await authHeaders(env, adminId);
    expect((await putRoles(env, headers, adminId, ["renter"])).status).toBe(409);
  });

  it("updates KYC status", async () => {
    const env = await makeTestEnv();
    await resetSchema(env);
    const adminId = await seedUser(env, "admin@example.com", "admin");
    const ownerId = await seedUser(env, "owner@example.com");
    const res = await call(app, env, `/api/admin/users/${ownerId}/kyc`, {
      method: "PATCH",
      headers: {
        ...(await authHeaders(env, adminId)),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "verified" }),
    });
    expect(res.status).toBe(200);
    const { rows } = await db(env).execute({
      sql: "SELECT kyc_status FROM profiles WHERE user_id = ?",
      args: [ownerId],
    });
    expect(rows[0].kyc_status).toBe("verified");
  });

  it("returns the analytics shape with correct totals", async () => {
    const env = await makeTestEnv();
    await resetSchema(env);
    const adminId = await seedUser(env, "admin@example.com", "admin");
    const ownerId = await seedUser(env, "owner@example.com");
    const renterId = await seedUser(env, "renter@example.com", "renter");

    const carId = crypto.randomUUID();
    await db(env).batch([
      {
        sql: `INSERT INTO cars (id, owner_id, make, model, year, category, daily_rate, address, features, images, is_active, status, created_at, updated_at)
              VALUES (?, ?, 'Tesla', 'Model 3', 2023, 'Electric', 100, 'MTL', '{}', '[]', 1, 'live', ?, ?)`,
        args: [carId, ownerId, now(), now()],
      },
      {
        sql: `INSERT INTO bookings (id, car_id, renter_id, start_date, end_date, total_days, total_price, status, created_at, updated_at)
              VALUES (?, ?, ?, '2026-01-01', '2026-01-03', 2, 200, 'completed', ?, ?)`,
        args: [crypto.randomUUID(), carId, renterId, now(), now()],
      },
    ]);

    const res = await call(app, env, "/api/admin/stats", {
      headers: await authHeaders(env, adminId),
    });
    expect(res.status).toBe(200);
    const stats = (await res.json()) as any;
    expect(stats.userSignups).toBeInstanceOf(Array);
    expect(stats.bookingsTrend).toBeInstanceOf(Array);
    expect(stats.userRoles).toBeInstanceOf(Array);
    expect(stats.engagementMetrics.totalUsers).toBe(3);
    expect(stats.engagementMetrics.totalBookings).toBe(1);
    expect(stats.engagementMetrics.activeUsers).toBe(1);
  });
});
