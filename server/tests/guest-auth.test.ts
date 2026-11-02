import { describe, it, expect } from "vitest";
import app from "../src/index";
import { makeTestEnv, resetSchema, call, seedUser, authHeaders } from "./helpers";
import { db } from "../src/db";

const now = (): string => new Date().toISOString();

const setCookieNames = (res: Response): string[] =>
  (res.headers.getSetCookie?.() ?? []).map((cookie) => cookie.split(";")[0]);

describe("guest auth", () => {
  it("creates a guest user with a renter role and free subscription", async () => {
    const env = await makeTestEnv();
    await resetSchema(env);

    const res = await call(app, env, "/api/auth/guest", { method: "POST" });
    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.token).toBeTypeOf("string");
    expect(body.user.isGuest).toBe(true);
    expect(body.user.email).toContain("@guests.carshare.local");

    const user = await db(env).execute({
      sql: "SELECT id, is_guest FROM users WHERE id = ?",
      args: [body.user.id],
    });
    expect(Number(user.rows[0].is_guest)).toBe(1);

    const role = await db(env).execute({
      sql: "SELECT role FROM user_roles WHERE user_id = ?",
      args: [body.user.id],
    });
    expect(role.rows.map((r) => r.role)).toEqual(["renter"]);

    const sub = await db(env).execute({
      sql: "SELECT plan FROM subscriptions WHERE user_id = ?",
      args: [body.user.id],
    });
    expect(sub.rows[0].plan).toBe("free");
  });

  it("authenticates a guest with either the bearer token or the session cookie", async () => {
    const env = await makeTestEnv();
    await resetSchema(env);
    const res = await call(app, env, "/api/auth/guest", { method: "POST" });
    const body = (await res.json()) as any;

    const bearer = await call(app, env, "/api/auth/me", {
      headers: { Authorization: `Bearer ${body.token}` },
    });
    expect(bearer.status).toBe(200);
    expect(((await bearer.json()) as any).user.isGuest).toBe(true);

    const cookies = setCookieNames(res);
    const session = cookies.find((cookie) => cookie.startsWith("carshare_session="));
    expect(session).toBeTruthy();
    const viaCookie = await call(app, env, "/api/auth/me", {
      headers: { Cookie: session as string },
    });
    expect(viaCookie.status).toBe(200);
    expect(((await viaCookie.json()) as any).user.id).toBe(body.user.id);
  });

  it("lets a guest complete a booking", async () => {
    const env = await makeTestEnv();
    await resetSchema(env);
    const ownerId = await seedUser(env, "owner@example.com");
    const carId = crypto.randomUUID();
    await db(env).execute({
      sql: `INSERT INTO cars (id, owner_id, make, model, year, category, daily_rate, address, features, images, is_active, status, created_at, updated_at)
            VALUES (?, ?, 'Tesla', 'Model 3', 2023, 'Electric', 100, 'MTL', '{}', '[]', 1, 'live', ?, ?)`,
      args: [carId, ownerId, now(), now()],
    });

    const guest = (await (await call(app, env, "/api/auth/guest", { method: "POST" })).json()) as any;
    const booking = await call(app, env, "/api/me/bookings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${guest.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        car_id: carId,
        start_date: "2027-02-01",
        end_date: "2027-02-03",
        renter_phone: "555-0100",
        renter_email: "guest@example.com",
      }),
    });
    expect(booking.status).toBe(201);
  });

  it("clears the session cookie on logout", async () => {
    const env = await makeTestEnv();
    await resetSchema(env);
    const res = await call(app, env, "/api/auth/logout", { method: "POST" });
    expect(res.status).toBe(200);
    const cleared = (res.headers.getSetCookie?.() ?? []).join(";");
    expect(cleared).toContain("carshare_session=");
  });

  it("keeps admin users visible with their guest flag", async () => {
    const env = await makeTestEnv();
    await resetSchema(env);
    const adminId = await seedUser(env, "admin@example.com", "admin");
    await call(app, env, "/api/auth/guest", { method: "POST" });
    const users = (await (
      await call(app, env, "/api/admin/users", { headers: await authHeaders(env, adminId) })
    ).json()) as any[];
    expect(users.some((u) => u.is_guest === 1 || u.is_guest === true)).toBe(true);
  });
});
