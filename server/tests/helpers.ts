import { mkdir, rm } from "node:fs/promises";
import type { Hono } from "hono";
import { applySchema } from "../src/bootstrap";
import { db } from "../src/db";
import { signToken } from "../src/auth";
import type { Env } from "../src/env";

export async function makeTestEnv(): Promise<Env> {
  await mkdir(".test", { recursive: true });
  return {
    TURSO_DATABASE_URL: `file:./.test/${crypto.randomUUID()}.db`,
    AUTH_SECRET: "test-secret",
    LICENSE_DISABLED: "1",
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

const now = (): string => new Date().toISOString();

export async function seedUser(
  env: Env,
  email = `${crypto.randomUUID()}@example.com`,
  role: "admin" | "owner" | "renter" = "owner"
): Promise<string> {
  const id = crypto.randomUUID();
  await db(env).batch([
    {
      sql: "INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?, ?, 'x', ?, ?)",
      args: [id, email, email.split("@")[0], now()],
    },
    {
      sql: "INSERT INTO profiles (id, user_id, full_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      args: [crypto.randomUUID(), id, email.split("@")[0], now(), now()],
    },
    {
      sql: "INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)",
      args: [crypto.randomUUID(), id, role],
    },
    {
      sql: "INSERT INTO subscriptions (id, user_id, plan, status, created_at, updated_at) VALUES (?, ?, 'free', 'active', ?, ?)",
      args: [crypto.randomUUID(), id, now(), now()],
    },
  ]);
  return id;
}

export async function authHeaders(env: Env, id: string, email = "user@example.com") {
  return { Authorization: `Bearer ${await signToken(env, { id, email })}` };
}

