import { describe, it, expect } from "vitest";
import app from "../src/index";
import { makeTestEnv, call } from "./helpers";
import { db } from "../src/db";
import type { Env } from "../src/env";

const json = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

const registerOwner = (env: Env, email = "owner@example.com") =>
  call(
    app,
    env,
    "/api/auth/register",
    json({ email, password: "password123", fullName: "Owner One", role: "owner" })
  );

describe("auth", () => {
  it("registers a user with profile, role, and subscription", async () => {
    const env = await makeTestEnv();
    const res = await registerOwner(env);
    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.token).toBeTypeOf("string");
    expect(body.user.email).toBe("owner@example.com");

    for (const table of ["users", "profiles", "user_roles", "subscriptions"]) {
      const { rows } = await db(env).execute(`SELECT COUNT(*) AS n FROM ${table}`);
      expect(Number(rows[0].n)).toBe(1);
    }
  });

  it("rejects a duplicate email", async () => {
    const env = await makeTestEnv();
    await registerOwner(env);
    const res = await registerOwner(env);
    expect(res.status).toBe(409);
  });

  it("rejects a short password", async () => {
    const env = await makeTestEnv();
    const res = await call(
      app,
      env,
      "/api/auth/register",
      json({ email: "a@example.com", password: "short", fullName: "A", role: "renter" })
    );
    expect(res.status).toBe(400);
  });

  it("refuses to self-register an admin", async () => {
    const env = await makeTestEnv();
    const res = await call(
      app,
      env,
      "/api/auth/register",
      json({ email: "a@example.com", password: "password123", fullName: "A", role: "admin" })
    );
    expect(res.status).toBe(400);
  });

  it("logs in with the right password and rejects the wrong one", async () => {
    const env = await makeTestEnv();
    await registerOwner(env);
    const ok = await call(
      app,
      env,
      "/api/auth/login",
      json({ email: "owner@example.com", password: "password123" })
    );
    expect(ok.status).toBe(200);
    expect(((await ok.json()) as any).token).toBeTypeOf("string");

    const bad = await call(
      app,
      env,
      "/api/auth/login",
      json({ email: "owner@example.com", password: "wrong-password" })
    );
    expect(bad.status).toBe(401);
  });

  it("returns the current user, profile, and roles", async () => {
    const env = await makeTestEnv();
    const reg = (await (await registerOwner(env)).json()) as any;
    const me = await call(app, env, "/api/auth/me", {
      headers: { Authorization: `Bearer ${reg.token}` },
    });
    expect(me.status).toBe(200);
    const body = (await me.json()) as any;
    expect(body.user.id).toBe(reg.user.id);
    expect(body.profile.full_name).toBe("Owner One");
    expect(body.roles).toEqual(["owner"]);

    const anonymous = await call(app, env, "/api/auth/me");
    expect(anonymous.status).toBe(401);
  });
});
