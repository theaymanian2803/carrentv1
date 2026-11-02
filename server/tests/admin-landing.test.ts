import { describe, it, expect } from "vitest";
import app from "../src/index";
import { makeTestEnv, resetSchema, call, seedUser, authHeaders } from "./helpers";
import { db } from "../src/db";

describe("admin landing sections", () => {
  it("includes hidden sections and round-trips content", async () => {
    const env = await makeTestEnv();
    await resetSchema(env);
    const adminId = await seedUser(env, "admin@example.com", "admin");
    const headers = { ...(await authHeaders(env, adminId)), "Content-Type": "application/json" };

    const created = await call(app, env, "/api/admin/landing-sections", {
      method: "POST",
      headers,
      body: JSON.stringify({
        section_type: "banner",
        title: "X",
        content: { subtitle: "hello" },
        is_visible: false,
      }),
    });
    expect(created.status).toBe(201);
    const section = (await created.json()) as any;
    expect(section.content).toEqual({ subtitle: "hello" });
    expect(section.is_visible).toBe(false);

    const list = (await (
      await call(app, env, "/api/admin/landing-sections", { headers })
    ).json()) as any[];
    expect(list).toHaveLength(1);
    expect(list[0].is_visible).toBe(false);

    const publicList = (await (
      await call(app, env, "/api/landing-sections")
    ).json()) as any[];
    expect(publicList).toHaveLength(0);
  });

  it("reorders sections and deletes them", async () => {
    const env = await makeTestEnv();
    await resetSchema(env);
    const adminId = await seedUser(env, "admin@example.com", "admin");
    const headers = { ...(await authHeaders(env, adminId)), "Content-Type": "application/json" };

    const make = async (title: string, sort: number) => {
      const res = await call(app, env, "/api/admin/landing-sections", {
        method: "POST",
        headers,
        body: JSON.stringify({ section_type: "hero", title, sort_order: sort }),
      });
      return ((await res.json()) as any).id as string;
    };
    const first = await make("First", 0);
    const second = await make("Second", 1);

    await call(app, env, `/api/admin/landing-sections/${first}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ sort_order: 1 }),
    });
    await call(app, env, `/api/admin/landing-sections/${second}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ sort_order: 0 }),
    });

    const list = (await (
      await call(app, env, "/api/admin/landing-sections", { headers })
    ).json()) as any[];
    expect(list.map((s) => s.title)).toEqual(["Second", "First"]);

    const removed = await call(app, env, `/api/admin/landing-sections/${first}`, {
      method: "DELETE",
      headers,
    });
    expect(removed.status).toBe(204);
    const after = await db(env).execute({ sql: "SELECT COUNT(*) AS n FROM landing_sections", args: [] });
    expect(Number(after.rows[0].n)).toBe(1);
  });

  it("rejects non-admin callers", async () => {
    const env = await makeTestEnv();
    await resetSchema(env);
    const ownerId = await seedUser(env, "owner@example.com");
    const res = await call(app, env, "/api/admin/landing-sections", {
      headers: await authHeaders(env, ownerId),
    });
    expect(res.status).toBe(403);
  });
});
