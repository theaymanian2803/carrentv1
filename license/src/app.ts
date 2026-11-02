import { Hono } from "hono";
import { cors } from "hono/cors";
import { issueGrant } from "./grant";
import type { LicenseMode, Store } from "./store";
import { keygen } from "./keys";
import { adminRoutes } from "./admin";

export type AppDeps = {
  store: Store;
  privateJwk: string;
  adminPassword: string;
  now?: () => number;
};

/** Managed grants are valid for the re-check interval plus a grace window. */
const MANAGED_TTL_MS = 44 * 24 * 60 * 60 * 1000;

/** Lowercases, strips scheme/path/port/trailing dot so bindings are exact. */
export function normalizeDomain(input: string): string {
  let s = String(input ?? "").trim().toLowerCase();
  try {
    if (s.includes("://")) s = new URL(s).host;
  } catch {
    /* not a URL, treat as host */
  }
  s = s.split("/")[0].replace(/:\d+$/, "").replace(/\.$/, "");
  return s;
}

export function createApp(deps: AppDeps): Hono {
  const now = deps.now ?? (() => Date.now());
  const app = new Hono();

  app.use("/v1/*", cors());

  const safeJson = async (c: { req: { json: () => Promise<unknown> } }) => {
    try {
      return (await c.req.json()) as Record<string, unknown>;
    } catch {
      return null;
    }
  };

  app.post("/v1/activate", async (c) => {
    const b = await safeJson(c);
    if (!b) return c.json({ error: "invalid" }, 400);
    const key = String(b.key ?? "").trim();
    const domain = normalizeDomain(String(b.domain ?? ""));
    const product = String(b.product ?? "").trim();
    if (!key || !domain || !product) return c.json({ error: "invalid" }, 400);

    const lic = await deps.store.getLicense(key);
    if (!lic) return c.json({ error: "invalid" }, 400);
    if (lic.product !== product) return c.json({ error: "product" }, 400);
    if (lic.status !== "active") return c.json({ error: "revoked" }, 400);
    if (lic.expires_at && Date.parse(lic.expires_at) < now()) return c.json({ error: "expired" }, 400);

    const existing = await deps.store.getActivation(key, domain);
    if (!existing) {
      const used = await deps.store.countActivations(key);
      if (used >= lic.max_domains) {
        return c.json({ error: "domain_limit", used, max: lic.max_domains }, 409);
      }
    }
    await deps.store.recordActivation(key, domain, new Date(now()).toISOString());

    const grant = await issueGrant(deps.privateJwk, {
      key,
      product,
      domain,
      mode: lic.mode,
      iat: Math.floor(now() / 1000),
      exp: lic.mode === "managed" ? Math.floor((now() + MANAGED_TTL_MS) / 1000) : undefined,
    });
    const used = await deps.store.countActivations(key);
    return c.json({ grant, mode: lic.mode, domains_used: used, max_domains: lic.max_domains });
  });

  app.post("/v1/heartbeat", async (c) => {
    const b = await safeJson(c);
    if (!b) return c.json({ error: "invalid" }, 403);
    const key = String(b.key ?? "").trim();
    const domain = normalizeDomain(String(b.domain ?? ""));
    const lic = await deps.store.getLicense(key);
    if (!lic || !domain) return c.json({ error: "invalid" }, 403);
    if (lic.status !== "active") return c.json({ error: "revoked" }, 403);
    if (lic.expires_at && Date.parse(lic.expires_at) < now()) return c.json({ error: "expired" }, 403);
    const act = await deps.store.getActivation(key, domain);
    if (!act) return c.json({ error: "invalid" }, 403);

    await deps.store.recordActivation(key, domain, new Date(now()).toISOString());
    const grant = await issueGrant(deps.privateJwk, {
      key,
      product: lic.product,
      domain,
      mode: lic.mode,
      iat: Math.floor(now() / 1000),
      exp: lic.mode === "managed" ? Math.floor((now() + MANAGED_TTL_MS) / 1000) : undefined,
    });
    return c.json({ grant });
  });

  // Seller tool; protected by the admin password so outsiders cannot free slots.
  app.post("/v1/deactivate", async (c) => {
    const b = await safeJson(c);
    if (!b) return c.json({ error: "invalid" }, 400);
    if (String(c.req.header("x-admin-password") ?? "") !== deps.adminPassword) {
      return c.json({ error: "unauthorized" }, 401);
    }
    const key = String(b.key ?? "").trim();
    const domain = normalizeDomain(String(b.domain ?? ""));
    if (!key || !domain) return c.json({ error: "invalid" }, 400);
    await deps.store.releaseActivation(key, domain);
    return c.json({ ok: true });
  });

  // Machine-facing key creation for a marketplace. Shared-secret protected.
  app.post("/v1/keys", async (c) => {
    if (String(c.req.header("x-admin-password") ?? "") !== deps.adminPassword) {
      return c.json({ error: "unauthorized" }, 401);
    }
    const b = await safeJson(c);
    if (!b) return c.json({ error: "invalid" }, 400);
    const product = String(b.product ?? "").trim();
    if (!product) return c.json({ error: "invalid" }, 400);
    const max_domains = Math.max(1, Number(b.max_domains ?? 3) || 3);
    const mode: LicenseMode = b.mode === "managed" ? "managed" : "forever";
    const prefix = product.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || "KEY";
    const key = keygen(prefix);
    await deps.store.createLicense({
      key,
      product,
      max_domains,
      mode,
      status: "active",
      expires_at: null,
      note: String(b.note ?? "").trim() || null,
      created_at: new Date(now()).toISOString(),
    });
    return c.json({ key });
  });

  app.route("/admin", adminRoutes({ store: deps.store, adminPassword: deps.adminPassword }));
  return app;
}
