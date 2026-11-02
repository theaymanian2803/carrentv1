import type { Hono } from "hono";
import type { AppEnv } from "../../env";
import { db } from "../../db";

const COLORS: Record<string, string> = {
  admin: "#ef4444",
  owner: "#3b82f6",
  renter: "#10b981",
};

export const adminStatsRoutes = (app: Hono<AppEnv>): void => {
  app.get("/stats", async (c) => {
    const d = db(c.env);
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [signups, bookingsTrend, roleRows, totalUsers, totalBookings, activeUsers] =
      await Promise.all([
        d.execute({
          sql: "SELECT substr(created_at, 1, 10) AS date, COUNT(*) AS count FROM profiles WHERE created_at >= ? GROUP BY date ORDER BY date",
          args: [since],
        }),
        d.execute({
          sql: "SELECT substr(created_at, 1, 10) AS date, COUNT(*) AS count FROM bookings WHERE created_at >= ? GROUP BY date ORDER BY date",
          args: [since],
        }),
        d.execute("SELECT role, COUNT(*) AS count FROM user_roles GROUP BY role"),
        d.execute("SELECT COUNT(*) AS n FROM profiles"),
        d.execute("SELECT COUNT(*) AS n FROM bookings"),
        d.execute({
          sql: "SELECT COUNT(DISTINCT renter_id) AS n FROM bookings WHERE created_at >= ?",
          args: [since],
        }),
      ]);

    const users = Number(totalUsers.rows[0].n);
    const bookings = Number(totalBookings.rows[0].n);

    return c.json({
      userSignups: signups.rows.map((row) => ({
        date: String(row.date),
        count: Number(row.count),
      })),
      bookingsTrend: bookingsTrend.rows.map((row) => ({
        date: String(row.date),
        count: Number(row.count),
      })),
      userRoles: roleRows.rows.map((row) => ({
        role: String(row.role),
        count: Number(row.count),
        color: COLORS[String(row.role)] ?? "#94a3b8",
      })),
      engagementMetrics: {
        totalUsers: users,
        activeUsers: Number(activeUsers.rows[0].n),
        totalBookings: bookings,
        avgBookingsPerUser: users ? Math.round((bookings / users) * 10) / 10 : 0,
      },
    });
  });
};
