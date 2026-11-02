import type { Client } from "@libsql/client";
import type { Env } from "./env";
import { db } from "./db";
import { SCHEMA_SQL } from "./schema";
import { hashPassword } from "./password";

const bootstrapped = new Set<string>();
const now = (): string => new Date().toISOString();

export async function applySchema(d: Client): Promise<void> {
  await d.executeMultiple(SCHEMA_SQL);
}

const tableExists = async (d: Client, name: string): Promise<boolean> => {
  const { rows } = await d.execute({
    sql: "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
    args: [name],
  });
  return rows.length > 0;
};

const applyMigrations = async (d: Client): Promise<void> => {
  const { rows } = await d.execute("PRAGMA table_info(users)");
  const columns = new Set(rows.map((row) => String(row.name)));
  if (!columns.has("google_sub")) {
    await d.execute("ALTER TABLE users ADD COLUMN google_sub TEXT");
  }
  if (!columns.has("is_guest")) {
    await d.execute("ALTER TABLE users ADD COLUMN is_guest INTEGER NOT NULL DEFAULT 0");
  }
  await d.execute(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_sub ON users(google_sub) WHERE google_sub IS NOT NULL"
  );
};

const ensureAdmin = async (env: Env, d: Client): Promise<void> => {
  const email = env.ADMIN_EMAIL!.trim().toLowerCase();
  const password = env.ADMIN_PASSWORD!;
  if (!email || password.length < 8) {
    console.error("[bootstrap] ADMIN_EMAIL/ADMIN_PASSWORD ignored: password must be 8+ chars");
    return;
  }

  const existing = await d.execute({
    sql: "SELECT id FROM users WHERE email = ? COLLATE NOCASE",
    args: [email],
  });

  if (existing.rows.length) {
    const userId = String(existing.rows[0].id);
    await d.batch([
      {
        sql: "INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, 'admin') ON CONFLICT DO NOTHING",
        args: [crypto.randomUUID(), userId],
      },
      {
        sql: `INSERT INTO profiles (id, user_id, full_name, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id) DO NOTHING`,
        args: [crypto.randomUUID(), userId, email.split("@")[0], now(), now()],
      },
      {
        sql: `INSERT INTO subscriptions (id, user_id, plan, status, created_at, updated_at)
              VALUES (?, ?, 'free', 'active', ?, ?) ON CONFLICT(user_id) DO NOTHING`,
        args: [crypto.randomUUID(), userId, now(), now()],
      },
    ]);
    return;
  }

  const userId = crypto.randomUUID();
  const passwordHash = await hashPassword(password);
  await d.batch([
    {
      sql: "INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?, ?, ?, ?, ?)",
      args: [userId, email, passwordHash, email.split("@")[0], now()],
    },
    {
      sql: `INSERT INTO profiles (id, user_id, full_name, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)`,
      args: [crypto.randomUUID(), userId, email.split("@")[0], now(), now()],
    },
    {
      sql: "INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, 'admin')",
      args: [crypto.randomUUID(), userId],
    },
    {
      sql: `INSERT INTO subscriptions (id, user_id, plan, status, created_at, updated_at)
            VALUES (?, ?, 'free', 'active', ?, ?)`,
      args: [crypto.randomUUID(), userId, now(), now()],
    },
  ]);
};

export async function ensureBootstrap(env: Env): Promise<void> {
  const key = env.TURSO_DATABASE_URL;
  if (bootstrapped.has(key)) return;

  const d = db(env);
  if (!(await tableExists(d, "users"))) {
    await applySchema(d);
  }
  await applyMigrations(d);
  if (env.ADMIN_EMAIL && env.ADMIN_PASSWORD) {
    await ensureAdmin(env, d);
  }
  bootstrapped.add(key);
}
