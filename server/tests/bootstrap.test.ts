import { describe, it, expect } from "vitest";
import { makeTestEnv, resetSchema } from "./helpers";
import { ensureBootstrap } from "../src/bootstrap";
import { db } from "../src/db";
import { verifyPassword } from "../src/password";

describe("bootstrap", () => {
  it("creates every table", async () => {
    const env = await makeTestEnv();
    await resetSchema(env);
    const { rows } = await db(env).execute(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    );
    const names = rows.map((r) => String(r.name));
    for (const t of [
      "users",
      "profiles",
      "user_roles",
      "cars",
      "bookings",
      "reviews",
      "subscriptions",
      "landing_sections",
      "media",
      "messages",
    ]) {
      expect(names).toContain(t);
    }
  });

  it("creates the env admin once and never rewrites its password", async () => {
    const env = {
      ...(await makeTestEnv()),
      ADMIN_EMAIL: "boss@example.com",
      ADMIN_PASSWORD: "secret123",
    };
    await ensureBootstrap(env);
    await ensureBootstrap(env);
    const { rows } = await db(env).execute("SELECT id, email, password_hash FROM users");
    expect(rows).toHaveLength(1);
    expect(await verifyPassword("secret123", String(rows[0].password_hash))).toBe(true);
    const roles = await db(env).execute({
      sql: "SELECT role FROM user_roles WHERE user_id = ?",
      args: [rows[0].id],
    });
    expect(roles.rows.map((r) => r.role)).toContain("admin");
  });
});
