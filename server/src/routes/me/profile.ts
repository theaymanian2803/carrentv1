import type { Hono } from "hono";
import type { AppEnv } from "../../env";
import { db } from "../../db";

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
    const body = await readJson<{ full_name?: string; avatar_url?: string }>(c);
    if (!body || (body.full_name === undefined && body.avatar_url === undefined)) {
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
};
