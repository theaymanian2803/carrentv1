import { createClient, type Client } from "@libsql/client";
import type { Env } from "./env";

export const db = (env: Env): Client =>
  createClient({
    url: env.TURSO_DATABASE_URL,
    authToken: env.TURSO_AUTH_TOKEN || undefined,
  });
