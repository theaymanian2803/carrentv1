import { mkdir, rm } from "node:fs/promises";
import type { Hono } from "hono";
import { applySchema } from "../src/bootstrap";
import { db } from "../src/db";
import type { Env } from "../src/env";

export async function makeTestEnv(): Promise<Env> {
  await mkdir(".test", { recursive: true });
  return {
    TURSO_DATABASE_URL: `file:./.test/${crypto.randomUUID()}.db`,
    AUTH_SECRET: "test-secret",
  };
}

export async function resetSchema(env: Env): Promise<void> {
  const file = env.TURSO_DATABASE_URL.replace(/^file:/, "");
  await rm(file, { force: true });
  await applySchema(db(env));
}

export async function call(
  app: Hono<any>,
  env: Env,
  path: string,
  init?: RequestInit
): Promise<Response> {
  return app.request(path, init, env);
}
