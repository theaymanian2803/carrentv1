import { Hono } from "hono";
import type { AppEnv } from "../env";
import { db } from "../db";

export const mediaRoutes = (app: Hono<AppEnv>): void => {
  const media = new Hono<AppEnv>();

  media.get("/:id", async (c) => {
    const { rows } = await db(c.env).execute({
      sql: "SELECT mime, data FROM media WHERE id = ?",
      args: [c.req.param("id")],
    });
    if (!rows.length) return c.json({ error: "Not found" }, 404);

    return new Response(rows[0].data as ArrayBuffer, {
      headers: {
        "Content-Type": String(rows[0].mime),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  });

  app.route("/media", media);
};
