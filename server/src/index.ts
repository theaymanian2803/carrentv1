import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./env";
import { ensureBootstrap } from "./bootstrap";

export type AppEnv = { Bindings: Env; Variables: { userId: string } };

const app = new Hono<AppEnv>().basePath("/api");

app.use("*", cors({ origin: (origin, c) => c.env.APP_ORIGIN || origin || "*" }));

app.use("*", async (c, next) => {
  try {
    await ensureBootstrap(c.env);
  } catch (err) {
    console.error("[bootstrap] failed:", err instanceof Error ? err.message : err);
  }
  await next();
});

app.get("/health", (c) => c.json({ ok: true }));

export default app;
