import { Hono } from "hono";
import { cors } from "hono/cors";
import type { AppEnv } from "./env";
import { ensureBootstrap } from "./bootstrap";
import { authRoutes } from "./routes/auth";
import { catalogRoutes } from "./routes/catalog";
import { mediaRoutes } from "./routes/media";
import { meRoutes } from "./routes/me";
import { adminRoutes } from "./routes/admin";
import { paymentRoutes } from "./routes/payments";
import { licenseRoutes } from "./routes/license";

export type { AppEnv };

const app = new Hono<AppEnv>().basePath("/api");

app.use("*", cors({ origin: (origin, c) => c.env.APP_ORIGIN || origin || "*" }));

app.get("/health", (c) => c.json({ ok: true }));

app.use("*", async (c, next) => {
  try {
    await ensureBootstrap(c.env);
  } catch (err) {
    console.error("[bootstrap] failed:", err instanceof Error ? err.message : err);
  }
  await next();
});

authRoutes(app);
licenseRoutes(app);
catalogRoutes(app);
mediaRoutes(app);
meRoutes(app);
adminRoutes(app);
paymentRoutes(app);

export default app;
