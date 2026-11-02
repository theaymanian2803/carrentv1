import { Hono } from "hono";
import type { AppEnv } from "../env";
import { db } from "../db";
import { requireAdmin, requireAuth } from "../auth";
import { adminUserRoutes } from "./admin/users";
import { adminStatsRoutes } from "./admin/stats";
import { adminCarRoutes } from "./admin/cars";
import { adminBookingRoutes } from "./admin/bookings";
import { adminSubscriptionRoutes } from "./admin/subscriptions";

export const adminRoutes = (app: Hono<AppEnv>): void => {
  const admin = new Hono<AppEnv>();
  admin.use("*", requireAuth);
  admin.use("*", requireAdmin);

  adminUserRoutes(admin);
  adminStatsRoutes(admin);
  adminCarRoutes(admin);
  adminBookingRoutes(admin);
  adminSubscriptionRoutes(admin);

  app.route("/admin", admin);
};
