import type { Hono } from "hono";
import type { AppEnv } from "../../env";
import { db } from "../../db";
import { hashPassword, verifyPassword } from "../../password";

const now = (): string => new Date().toISOString();
const readJson = async <T>(c: { req: { json: () => Promise<unknown> } }): Promise<T | null> => {
  try {
    return (await c.req.json()) as T;
  } catch {
    return null;
  }
};

export const profileRoutes = (app: Hono<AppEnv>): void => {
  app.get("/profile", async (c) => {
    const { rows } = await db(c.env).execute({
      sql: "SELECT * FROM profiles WHERE user_id = ?",
      args: [c.get("userId")],
    });
    return c.json(rows[0] ?? null);
  });

  app.put("/profile", async (c) => {
    const body = await readJson<{
      full_name?: string;
      avatar_url?: string;
      onboarding_completed?: boolean;
    }>(c);
    if (
      !body ||
      (body.full_name === undefined &&
        body.avatar_url === undefined &&
        body.onboarding_completed === undefined)
    ) {
      return c.json({ error: "Nothing to update" }, 400);
    }

    const sets: string[] = [];
    const args: unknown[] = [];
    if (body.full_name !== undefined) {
      sets.push("full_name = ?");
      args.push(body.full_name);
    }
    if (body.avatar_url !== undefined) {
      sets.push("avatar_url = ?");
      args.push(body.avatar_url);
    }
    if (body.onboarding_completed !== undefined) {
      sets.push("onboarding_completed = ?");
      args.push(body.onboarding_completed ? 1 : 0);
    }
    sets.push("updated_at = ?");
    args.push(now());
    args.push(c.get("userId"));

    await db(c.env).execute({
      sql: `UPDATE profiles SET ${sets.join(", ")} WHERE user_id = ?`,
      args: args as never[],
    });
    const { rows } = await db(c.env).execute({
      sql: "SELECT * FROM profiles WHERE user_id = ?",
      args: [c.get("userId")],
    });
    return c.json(rows[0] ?? null);
  });

  app.post("/password", async (c) => {
    const body = await readJson<{ current_password?: string; new_password?: string }>(c);
    if (!body?.current_password || !body.new_password) {
      return c.json({ error: "current_password and new_password are required" }, 400);
    }
    if (body.new_password.length < 8) {
      return c.json({ error: "New password must be at least 8 characters" }, 400);
    }

    const { rows } = await db(c.env).execute({
      sql: "SELECT password_hash FROM users WHERE id = ?",
      args: [c.get("userId")],
    });
    if (!rows.length) return c.json({ error: "Not found" }, 404);

    const valid = await verifyPassword(body.current_password, String(rows[0].password_hash));
    if (!valid) {
      return c.json({ error: "Current password is incorrect" }, 400);
    }

    await db(c.env).execute({
      sql: "UPDATE users SET password_hash = ? WHERE id = ?",
      args: [await hashPassword(body.new_password), c.get("userId")],
    });
    return c.json({ ok: true });
  });
};
