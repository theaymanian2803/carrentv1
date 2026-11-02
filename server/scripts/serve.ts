// @ts-nocheck — Bun-only dev harness; production runs the same Hono app in Wrangler.
import app from "../src/index";
import type { Env } from "../src/env";

const env = {
  TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL ?? "file:./.smoke/smoke.db",
  AUTH_SECRET: process.env.AUTH_SECRET ?? "smoke-secret",
  ADMIN_EMAIL: process.env.ADMIN_EMAIL ?? "admin@carshare.dev",
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ?? "admin12345",
} as Env;

Bun.serve({
  port: 8787,
  fetch: (request: Request) => app.fetch(request, env),
});

console.log("API listening on http://127.0.0.1:8787");
