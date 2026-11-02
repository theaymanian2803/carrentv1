import { Hono } from "hono";
import type { AppEnv } from "../env";
import { db } from "../db";
import { requireAdmin, requireAuth } from "../auth";
import { adminUserRoutes } from "./admin/users";
import { adminStatsRoutes } from "./admin/stats";

export const adminRoutes = (app: Hono<AppEnv>): void => {
  const admin = new Hono<AppEnv>();
  admin.use("*", requireAuth);
  admin.use("*", requireAdmin);

  adminUserRoutes(admin);
  adminStatsRoutes(admin);

  app.route("/admin", admin);
};
