import { Hono } from "hono";
import type { AppEnv } from "../env";
import { db } from "../db";
import { requireAuth } from "../auth";
import { profileRoutes } from "./me/profile";
import { carRoutes } from "./me/cars";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

export const meRoutes = (app: Hono<AppEnv>): void => {
  const me = new Hono<AppEnv>();
  me.use("*", requireAuth);

  profileRoutes(me);
  carRoutes(me);

  me.post("/upload", async (c) => {
    const body = await c.req.parseBody();
    const file = body["file"];

    if (!file || typeof file === "string" || typeof (file as File).arrayBuffer !== "function") {
      return c.json({ error: "A file is required" }, 400);
    }
    const upload = file as File;
    if (!IMAGE_TYPES.has(upload.type)) return c.json({ error: "Unsupported image type" }, 415);
    if (upload.size > MAX_UPLOAD_BYTES) return c.json({ error: "Image must be 5 MB or smaller" }, 413);

    const id = crypto.randomUUID();
    const bytes = new Uint8Array(await upload.arrayBuffer());
    await db(c.env).execute({
      sql: "INSERT INTO media (id, mime, data, created_at) VALUES (?, ?, ?, ?)",
      args: [id, upload.type, bytes, new Date().toISOString()],
    });
    return c.json({ url: `/api/media/${id}` }, 201);
  });

  me.get("/subscription", async (c) => {
    const userId = c.get("userId");
    const d = db(c.env);
    const [subRes, countRes] = await Promise.all([
      d.execute({
        sql: "SELECT plan, status FROM subscriptions WHERE user_id = ?",
        args: [userId],
      }),
      d.execute({
        sql: "SELECT COUNT(*) AS n FROM cars WHERE owner_id = ?",
        args: [userId],
      }),
    ]);

    const plan = subRes.rows.length && subRes.rows[0].plan === "pro" ? "pro" : "free";
    const status = subRes.rows.length ? String(subRes.rows[0].status) : "active";
    return c.json({
      plan,
      status,
      listingCount: Number(countRes.rows[0].n),
      listingLimit: plan === "pro" && status === "active" ? 15 : 3,
    });
  });

  app.route("/me", me);
};
