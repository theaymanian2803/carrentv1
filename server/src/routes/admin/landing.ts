import type { Hono } from "hono";
import type { AppEnv } from "../../env";
import { db } from "../../db";
import { mapSection, type Row } from "../../lib/serialize";

const now = (): string => new Date().toISOString();

const readJson = async <T>(c: { req: { json: () => Promise<unknown> } }): Promise<T | null> => {
  try {
    return (await c.req.json()) as T;
  } catch {
    return null;
  }
};

interface SectionBody {
  section_type?: string;
  title?: string;
  content?: Record<string, unknown>;
  sort_order?: number;
  is_visible?: boolean;
}

export const adminLandingRoutes = (app: Hono<AppEnv>): void => {
  app.get("/landing-sections", async (c) => {
    const { rows } = await db(c.env).execute(
      "SELECT * FROM landing_sections ORDER BY sort_order ASC"
    );
    return c.json(rows.map((row) => mapSection(row as Row)));
  });

  app.post("/landing-sections", async (c) => {
    const body = await readJson<SectionBody>(c);
    if (!body?.section_type) return c.json({ error: "section_type is required" }, 400);

    let sortOrder = body.sort_order;
    if (sortOrder === undefined) {
      const { rows } = await db(c.env).execute(
        "SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM landing_sections"
      );
      sortOrder = Number(rows[0].next);
    }

    const id = crypto.randomUUID();
    await db(c.env).execute({
      sql: `INSERT INTO landing_sections (id, section_type, title, content, sort_order, is_visible, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        body.section_type,
        body.title ?? "",
        JSON.stringify(body.content ?? {}),
        sortOrder,
        body.is_visible === false ? 0 : 1,
        now(),
        now(),
      ],
    });

    const { rows } = await db(c.env).execute({
      sql: "SELECT * FROM landing_sections WHERE id = ?",
      args: [id],
    });
    return c.json(mapSection(rows[0] as Row), 201);
  });

  app.put("/landing-sections/:id", async (c) => {
    const body = await readJson<SectionBody>(c);
    if (!body) return c.json({ error: "Invalid JSON body" }, 400);

    const sets: string[] = [];
    const args: unknown[] = [];
    if (body.section_type !== undefined) {
      sets.push("section_type = ?");
      args.push(body.section_type);
    }
    if (body.title !== undefined) {
      sets.push("title = ?");
      args.push(body.title);
    }
    if (body.content !== undefined) {
      sets.push("content = ?");
      args.push(JSON.stringify(body.content));
    }
    if (body.sort_order !== undefined) {
      sets.push("sort_order = ?");
      args.push(body.sort_order);
    }
    if (body.is_visible !== undefined) {
      sets.push("is_visible = ?");
      args.push(body.is_visible ? 1 : 0);
    }
    if (!sets.length) return c.json({ error: "Nothing to update" }, 400);

    sets.push("updated_at = ?");
    args.push(now(), c.req.param("id"));
    const result = await db(c.env).execute({
      sql: `UPDATE landing_sections SET ${sets.join(", ")} WHERE id = ?`,
      args: args as never[],
    });
    if (!result.rowsAffected) return c.json({ error: "Not found" }, 404);

    const { rows } = await db(c.env).execute({
      sql: "SELECT * FROM landing_sections WHERE id = ?",
      args: [c.req.param("id")],
    });
    return c.json(mapSection(rows[0] as Row));
  });

  app.delete("/landing-sections/:id", async (c) => {
    const result = await db(c.env).execute({
      sql: "DELETE FROM landing_sections WHERE id = ?",
      args: [c.req.param("id")],
    });
    if (!result.rowsAffected) return c.json({ error: "Not found" }, 404);
    return c.body(null, 204);
  });
};
