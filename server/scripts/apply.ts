import { loadDevVars } from "./dev-vars";
import { applySchema } from "../src/bootstrap";
import { db } from "../src/db";
import type { Env } from "../src/env";

loadDevVars();

const env = {
  TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL ?? "",
  TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN,
} as Env;

if (!env.TURSO_DATABASE_URL) {
  console.error("TURSO_DATABASE_URL is required (server/.dev.vars or the environment).");
  process.exit(1);
}

await applySchema(db(env));
const { rows } = await db(env).execute(
  "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
);
console.log(`Applied schema. Tables: ${rows.map((r) => r.name).join(", ")}`);
