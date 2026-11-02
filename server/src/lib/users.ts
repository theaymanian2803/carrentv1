import type { Client } from "@libsql/client";

const now = (): string => new Date().toISOString();

/** Creates the profile, role, and subscription rows a user needs, idempotently. */
export async function ensureUserRecords(
  d: Client,
  user: { id: string; email: string; name: string | null }
): Promise<void> {
  await d.batch([
    {
      sql: `INSERT INTO profiles (id, user_id, full_name, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id) DO NOTHING`,
      args: [
        crypto.randomUUID(),
        user.id,
        user.name ?? user.email.split("@")[0],
        now(),
        now(),
      ],
    },
    {
      sql: "INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, 'renter') ON CONFLICT DO NOTHING",
      args: [crypto.randomUUID(), user.id],
    },
    {
      sql: `INSERT INTO subscriptions (id, user_id, plan, status, created_at, updated_at)
            VALUES (?, ?, 'free', 'active', ?, ?) ON CONFLICT(user_id) DO NOTHING`,
      args: [crypto.randomUUID(), user.id, now(), now()],
    },
  ]);
}

export async function grantAdminRole(d: Client, userId: string): Promise<void> {
  await d.execute({
    sql: "INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, 'admin') ON CONFLICT DO NOTHING",
    args: [crypto.randomUUID(), userId],
  });
}
