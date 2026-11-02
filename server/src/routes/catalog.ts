import { Hono } from "hono";
import type { AppEnv } from "../env";
import { db } from "../db";
import { optionalAuth } from "../auth";

type Row = Record<string, unknown>;

const parseJson = <T>(value: unknown, fallback: T): T => {
  try {
    return JSON.parse(String(value)) as T;
  } catch {
    return fallback;
  }
};

const CAR_SELECT = `
  SELECT c.*,
    p.full_name AS owner_full_name,
    p.avatar_url AS owner_avatar_url,
    p.kyc_status AS owner_kyc_status,
    (SELECT COALESCE(AVG(r.rating), 0) FROM reviews r WHERE r.reviewee_id = c.owner_id) AS owner_rating_avg,
    (SELECT COUNT(*) FROM reviews r WHERE r.reviewee_id = c.owner_id) AS owner_review_count
  FROM cars c
  LEFT JOIN profiles p ON p.user_id = c.owner_id
`;

const mapCar = (row: Row) => ({
  id: String(row.id),
  owner_id: String(row.owner_id),
  make: String(row.make),
  model: String(row.model),
  year: Number(row.year),
  category: String(row.category),
  daily_rate: Number(row.daily_rate),
  location_lat: row.location_lat === null ? null : Number(row.location_lat),
  location_lng: row.location_lng === null ? null : Number(row.location_lng),
  address: String(row.address ?? ""),
  description: row.description === null ? null : String(row.description),
  features: parseJson<Record<string, unknown>>(row.features, {}),
  images: parseJson<string[]>(row.images, []),
  is_active: Boolean(row.is_active),
  status: String(row.status),
  created_at: String(row.created_at),
  updated_at: String(row.updated_at),
  owner: {
    id: String(row.owner_id),
    full_name: row.owner_full_name === null ? null : String(row.owner_full_name),
    avatar_url: row.owner_avatar_url === null ? null : String(row.owner_avatar_url),
    kyc_status: row.owner_kyc_status === null ? null : String(row.owner_kyc_status),
    rating_avg: Number(row.owner_rating_avg ?? 0),
    review_count: Number(row.owner_review_count ?? 0),
  },
});

const mapSection = (row: Row) => ({
  id: String(row.id),
  section_type: String(row.section_type),
  title: String(row.title ?? ""),
  content: parseJson<Record<string, unknown>>(row.content, {}),
  sort_order: Number(row.sort_order),
  is_visible: Boolean(row.is_visible),
  created_at: String(row.created_at),
  updated_at: String(row.updated_at),
});

export const catalogRoutes = (app: Hono<AppEnv>): void => {
  const catalog = new Hono<AppEnv>();

  catalog.get("/cars", async (c) => {
    const clauses = ["c.status = 'live'", "c.is_active = 1"];
    const args: unknown[] = [];

    const category = c.req.query("category");
    if (category) {
      clauses.push("c.category = ?");
      args.push(category);
    }
    const minPrice = c.req.query("minPrice");
    if (minPrice) {
      clauses.push("c.daily_rate >= ?");
      args.push(Number(minPrice));
    }
    const maxPrice = c.req.query("maxPrice");
    if (maxPrice) {
      clauses.push("c.daily_rate <= ?");
      args.push(Number(maxPrice));
    }
    const q = c.req.query("q");
    if (q) {
      clauses.push("(c.make LIKE ? OR c.model LIKE ? OR c.address LIKE ?)");
      args.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    const sql = `${CAR_SELECT} WHERE ${clauses.join(" AND ")} ORDER BY c.created_at DESC LIMIT ?`;
    args.push(Number(c.req.query("limit") ?? 60));

    const { rows } = await db(c.env).execute({ sql, args: args as never[] });
    return c.json(rows.map((row) => mapCar(row as Row)));
  });

  catalog.get("/cars/:id", optionalAuth, async (c) => {
    const id = c.req.param("id");
    const { rows } = await db(c.env).execute({ sql: `${CAR_SELECT} WHERE c.id = ?`, args: [id] });
    if (!rows.length) return c.json({ error: "Not found" }, 404);

    const row = rows[0] as Row;
    const isPublic = row.status === "live" && Boolean(row.is_active);
    if (!isPublic) {
      const userId = c.get("userId");
      let allowed = userId === String(row.owner_id);
      if (!allowed && userId) {
        const role = await db(c.env).execute({
          sql: "SELECT 1 FROM user_roles WHERE user_id = ? AND role = 'admin'",
          args: [userId],
        });
        allowed = role.rows.length > 0;
      }
      if (!allowed) return c.json({ error: "Not found" }, 404);
    }
    return c.json(mapCar(row));
  });

  catalog.get("/cars/:id/reviews", async (c) => {
    const { rows: carRows } = await db(c.env).execute({
      sql: "SELECT owner_id FROM cars WHERE id = ?",
      args: [c.req.param("id")],
    });
    if (!carRows.length) return c.json({ error: "Not found" }, 404);
    const { rows } = await db(c.env).execute({
      sql: "SELECT * FROM reviews WHERE reviewee_id = ? ORDER BY created_at DESC",
      args: [String(carRows[0].owner_id)],
    });
    return c.json(rows);
  });

  catalog.get("/reviews", async (c) => {
    const revieweeId = c.req.query("reviewee_id");
    if (!revieweeId) return c.json([]);
    const { rows } = await db(c.env).execute({
      sql: "SELECT * FROM reviews WHERE reviewee_id = ? ORDER BY created_at DESC",
      args: [revieweeId],
    });
    return c.json(rows);
  });

  catalog.get("/landing-sections", async (c) => {
    const { rows } = await db(c.env).execute(
      "SELECT * FROM landing_sections WHERE is_visible = 1 ORDER BY sort_order ASC"
    );
    return c.json(rows.map((row) => mapSection(row as Row)));
  });

  app.route("/", catalog);
};
