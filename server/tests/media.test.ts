import { describe, it, expect } from "vitest";
import app from "../src/index";
import { makeTestEnv, resetSchema, call } from "./helpers";
import { db } from "../src/db";

describe("media", () => {
  it("serves stored bytes with the stored mime and immutable caching", async () => {
    const env = await makeTestEnv();
    await resetSchema(env);
    const id = crypto.randomUUID();
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    await db(env).execute({
      sql: "INSERT INTO media (id, mime, data, created_at) VALUES (?, ?, ?, ?)",
      args: [id, "image/png", bytes, new Date().toISOString()],
    });

    const res = await call(app, env, `/api/media/${id}`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("image/png");
    expect(res.headers.get("cache-control")).toContain("immutable");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(bytes);
  });

  it("returns 404 for an unknown id", async () => {
    const env = await makeTestEnv();
    await resetSchema(env);
    const res = await call(app, env, `/api/media/${crypto.randomUUID()}`);
    expect(res.status).toBe(404);
  });
});
