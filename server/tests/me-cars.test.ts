import { describe, it, expect } from "vitest";
import app from "../src/index";
import { makeTestEnv, resetSchema, call, seedUser, authHeaders } from "./helpers";
import { db } from "../src/db";
import type { Env } from "../src/env";

const carBody = (overrides: Record<string, unknown> = {}) => ({
  make: "Tesla",
  model: "Model 3",
  year: 2023,
  category: "Electric",
  daily_rate: 89,
  address: "Montréal, QC",
  description: "Nice car",
  features: { GPS: true },
  images: [],
  ...overrides,
});

const createCar = async (env: Env, headers: Record<string, string>, overrides = {}) =>
  call(app, env, "/api/me/cars", {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(carBody(overrides)),
  });

describe("my cars", () => {
  it("creates a pending, active car owned by the caller", async () => {
    const env = await makeTestEnv();
    await resetSchema(env);
    const ownerId = await seedUser(env, "owner@example.com");
    const headers = await authHeaders(env, ownerId);

    const res = await createCar(env, headers);
    expect(res.status).toBe(201);
    const car = (await res.json()) as any;
    expect(car.status).toBe("pending_approval");
    expect(car.is_active).toBe(true);
    expect(car.owner_id).toBe(ownerId);
    expect(car.images).toEqual([]);
    expect(car.features).toEqual({ GPS: true });
  });

  it("blocks the fourth car on the free plan and allows it after upgrading", async () => {
    const env = await makeTestEnv();
    await resetSchema(env);
    const ownerId = await seedUser(env, "owner@example.com");
    const headers = await authHeaders(env, ownerId);

    for (let i = 0; i < 3; i++) expect((await createCar(env, headers)).status).toBe(201);
    const fourth = await createCar(env, headers);
    expect(fourth.status).toBe(403);

    await db(env).execute({
      sql: "UPDATE subscriptions SET plan = 'pro', status = 'active' WHERE user_id = ?",
      args: [ownerId],
    });
    expect((await createCar(env, headers)).status).toBe(201);
  });

  it("refuses to update or delete another owner's car", async () => {
    const env = await makeTestEnv();
    await resetSchema(env);
    const ownerId = await seedUser(env, "owner@example.com");
    const otherId = await seedUser(env, "other@example.com");
    const ownerHeaders = await authHeaders(env, ownerId);
    const otherHeaders = await authHeaders(env, otherId);
    const car = (await (await createCar(env, ownerHeaders)).json()) as any;

    const update = await call(app, env, `/api/me/cars/${car.id}`, {
      method: "PUT",
      headers: { ...otherHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ daily_rate: 1 }),
    });
    expect(update.status).toBe(404);

    const remove = await call(app, env, `/api/me/cars/${car.id}`, {
      method: "DELETE",
      headers: otherHeaders,
    });
    expect(remove.status).toBe(404);
  });

  it("reports listing counts and limits", async () => {
    const env = await makeTestEnv();
    await resetSchema(env);
    const ownerId = await seedUser(env, "owner@example.com");
    const headers = await authHeaders(env, ownerId);
    for (let i = 0; i < 3; i++) await createCar(env, headers);

    const free = (await (await call(app, env, "/api/me/subscription", { headers })).json()) as any;
    expect(free).toMatchObject({ plan: "free", listingCount: 3, listingLimit: 3 });

    await db(env).execute({
      sql: "UPDATE subscriptions SET plan = 'pro', status = 'active' WHERE user_id = ?",
      args: [ownerId],
    });
    const pro = (await (await call(app, env, "/api/me/subscription", { headers })).json()) as any;
    expect(pro).toMatchObject({ plan: "pro", listingLimit: 15 });
  });

  it("uploads an image, rejects non-images, and rejects files over 5 MB", async () => {
    const env = await makeTestEnv();
    await resetSchema(env);
    const ownerId = await seedUser(env, "owner@example.com");
    const headers = await authHeaders(env, ownerId);

    const okForm = new FormData();
    okForm.append("file", new File([new Uint8Array(2 * 1024 * 1024)], "car.png", { type: "image/png" }));
    const ok = await call(app, env, "/api/me/upload", { method: "POST", headers, body: okForm });
    expect(ok.status).toBe(201);
    const { url } = (await ok.json()) as any;
    expect(url).toMatch(/^\/api\/media\//);

    const textForm = new FormData();
    textForm.append("file", new File(["hello"], "car.txt", { type: "text/plain" }));
    const badType = await call(app, env, "/api/me/upload", { method: "POST", headers, body: textForm });
    expect(badType.status).toBe(415);

    const bigForm = new FormData();
    bigForm.append("file", new File([new Uint8Array(6 * 1024 * 1024)], "big.png", { type: "image/png" }));
    const tooBig = await call(app, env, "/api/me/upload", { method: "POST", headers, body: bigForm });
    expect(tooBig.status).toBe(413);
  });

  it("updates the caller's profile and rejects an empty body", async () => {
    const env = await makeTestEnv();
    await resetSchema(env);
    const ownerId = await seedUser(env, "owner@example.com");
    const headers = await authHeaders(env, ownerId);

    const res = await call(app, env, "/api/me/profile", {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: "New Name" }),
    });
    expect(res.status).toBe(200);
    expect(((await res.json()) as any).full_name).toBe("New Name");

    const empty = await call(app, env, "/api/me/profile", {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(empty.status).toBe(400);
  });
});
