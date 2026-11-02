import { describe, it, expect } from "vitest";
import app from "../src/index";
import { makeTestEnv, resetSchema, call, seedUser, authHeaders } from "./helpers";
import { db } from "../src/db";

const json = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

describe("onboarding", () => {
  it("seeds demo cars and homepage sections only once", async () => {
    const env = await makeTestEnv();
    await resetSchema(env);
    const adminId = await seedUser(env, "admin@example.com", "admin");
    const headers = await authHeaders(env, adminId);

    const first = await call(app, env, "/api/admin/demo-data", { method: "POST", headers });
    expect(first.status).toBe(200);
    const firstBody = (await first.json()) as any;
    expect(firstBody.seeded).toBe(true);

    const cars = await db(env).execute("SELECT COUNT(*) AS n FROM cars");
    expect(Number(cars.rows[0].n)).toBeGreaterThanOrEqual(4);
    const sections = await db(env).execute("SELECT COUNT(*) AS n FROM landing_sections");
    expect(Number(sections.rows[0].n)).toBeGreaterThanOrEqual(4);

    const second = await call(app, env, "/api/admin/demo-data", { method: "POST", headers });
    expect(second.status).toBe(200);
    expect(((await second.json()) as any).seeded).toBe(false);
    const carsAfter = await db(env).execute("SELECT COUNT(*) AS n FROM cars");
    expect(Number(carsAfter.rows[0].n)).toBe(Number(cars.rows[0].n));
  });

  it("lets an email user change their password", async () => {
    const env = await makeTestEnv();
    await resetSchema(env);
    const registered = await call(
      app,
      env,
      "/api/auth/register",
      json({
        email: "owner@example.com",
        password: "password123",
        fullName: "Owner",
        role: "owner",
      })
    );
    expect(registered.status).toBe(201);
    const { token } = (await registered.json()) as any;

    const changed = await call(app, env, "/api/me/password", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ current_password: "password123", new_password: "newpassword456" }),
    });
    expect(changed.status).toBe(200);

    const oldLogin = await call(
      app,
      env,
      "/api/auth/login",
      json({ email: "owner@example.com", password: "password123" })
    );
    expect(oldLogin.status).toBe(401);

    const newLogin = await call(
      app,
      env,
      "/api/auth/login",
      json({ email: "owner@example.com", password: "newpassword456" })
    );
    expect(newLogin.status).toBe(200);
  });

  it("persists the onboarding flag on the profile", async () => {
    const env = await makeTestEnv();
    await resetSchema(env);
    const userId = await seedUser(env, "owner@example.com");
    const headers = { ...(await authHeaders(env, userId)), "Content-Type": "application/json" };

    const updated = await call(app, env, "/api/me/profile", {
      method: "PUT",
      headers,
      body: JSON.stringify({ onboarding_completed: true }),
    });
    expect(updated.status).toBe(200);
    expect(Number(((await updated.json()) as any).onboarding_completed)).toBe(1);

    const me = await call(app, env, "/api/auth/me", {
      headers: { Authorization: (headers.Authorization as string) },
    });
    expect(Number(((await me.json()) as any).profile.onboarding_completed)).toBe(1);
  });
});
