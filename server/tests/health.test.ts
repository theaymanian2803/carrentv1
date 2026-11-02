import { describe, it, expect } from "vitest";
import app from "../src/index";
import { makeTestEnv, call } from "./helpers";

describe("health", () => {
  it("returns ok without authentication", async () => {
    const env = await makeTestEnv();
    const res = await call(app, env, "/api/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
