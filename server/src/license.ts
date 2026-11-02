import { importJWK, jwtVerify, type JWK } from "jose";
import type { Context, MiddlewareHandler } from "hono";
import type { AppEnv } from "./env";
import { db } from "./db";
import { DEFAULT_LICENSE_PRODUCT, DEFAULT_LICENSE_PUBLIC_KEY } from "./license-defaults";

export const LICENSE_SETTING_KEY = "license_grant";
export const LICENSE_LAST_CHECK_KEY = "license_last_check";
const LAST_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

export type LicenseStatus = {
  licensed: boolean;
  disabled: boolean;
  domain: string;
  mode: string | null;
  product: string;
  expires_at: string | null;
  key: string | null;
  reason?: string;
};

export interface LicensePayload {
  key?: string;
  product?: string;
  domain?: string;
  mode?: string;
  exp?: number;
  iat?: number;
}

export const licenseDomain = (env: AppEnv["Bindings"], requestUrl: string): string => {
  const origin = env.APP_ORIGIN ? new URL(env.APP_ORIGIN) : new URL(requestUrl);
  return origin.hostname.toLowerCase().replace(/\.$/, "");
};

const publicKey = async (env: AppEnv["Bindings"]) => {
  const raw = env.LICENSE_PUBLIC_KEY || DEFAULT_LICENSE_PUBLIC_KEY;
  return importJWK(JSON.parse(raw) as JWK, "EdDSA");
};

export async function verifyLicenseGrant(
  env: AppEnv["Bindings"],
  token: string,
  domain: string
): Promise<{ ok: true; payload: LicensePayload } | { ok: false; reason: string }> {
  try {
    const key = await publicKey(env);
    const { payload } = await jwtVerify(token, key, { algorithms: ["EdDSA"] });
    const data = payload as LicensePayload;
    const product = env.LICENSE_PRODUCT || DEFAULT_LICENSE_PRODUCT;

    if (data.product !== product) return { ok: false, reason: "product_mismatch" };
    if (!data.domain || data.domain !== domain) return { ok: false, reason: "domain_mismatch" };
    return { ok: true, payload: data };
  } catch (err) {
    const message = err instanceof Error ? err.message : "invalid";
    const code = (err as { code?: string })?.code ?? "";
    const expired = code.includes("EXPIRED") || message.toLowerCase().includes("expired");
    return { ok: false, reason: expired ? "expired" : "invalid" };
  }
}

export async function getLicenseStatus(c: Context<AppEnv>): Promise<LicenseStatus> {
  const domain = licenseDomain(c.env, c.req.url);
  const base: LicenseStatus = {
    licensed: false,
    disabled: c.env.LICENSE_DISABLED === "1",
    domain,
    mode: null,
    product: c.env.LICENSE_PRODUCT || DEFAULT_LICENSE_PRODUCT,
    expires_at: null,
    key: null,
  };

  if (base.disabled) return { ...base, licensed: true };

  const { rows } = await db(c.env).execute({
    sql: "SELECT value FROM settings WHERE key = ?",
    args: [LICENSE_SETTING_KEY],
  });
  if (!rows.length) return { ...base, reason: "missing" };

  const token = String(rows[0].value);
  const verified = await verifyLicenseGrant(c.env, token, domain);
  if (!verified.ok) return { ...base, reason: verified.reason };

  let payload = verified.payload;
  if (payload.mode === "managed" && c.env.LICENSE_SERVER_URL) {
    const refreshed = await refreshManaged(c.env, payload, domain);
    if (!refreshed.ok) return { ...base, reason: refreshed.reason };
    if (refreshed.payload) payload = refreshed.payload;
  }

  return {
    ...base,
    licensed: true,
    mode: payload.mode ?? "forever",
    expires_at: payload.exp ? new Date(payload.exp * 1000).toISOString() : null,
    key: payload.key ?? null,
  };
}

const getSetting = async (env: AppEnv["Bindings"], key: string): Promise<string | null> => {
  const { rows } = await db(env).execute({
    sql: "SELECT value FROM settings WHERE key = ?",
    args: [key],
  });
  return rows.length ? String(rows[0].value) : null;
};

const setSetting = async (env: AppEnv["Bindings"], key: string, value: string): Promise<void> => {
  await db(env).execute({
    sql: `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    args: [key, value, new Date().toISOString()],
  });
};

export async function deleteLicenseGrant(env: AppEnv["Bindings"]): Promise<void> {
  await db(env).execute({
    sql: "DELETE FROM settings WHERE key IN (?, ?)",
    args: [LICENSE_SETTING_KEY, LICENSE_LAST_CHECK_KEY],
  });
}

async function refreshManaged(
  env: AppEnv["Bindings"],
  payload: LicensePayload,
  domain: string
): Promise<{ ok: true; payload?: LicensePayload } | { ok: false; reason: string }> {
  if (!env.LICENSE_SERVER_URL) return { ok: true, payload };

  const last = await getSetting(env, LICENSE_LAST_CHECK_KEY);
  if (last && Date.now() - Date.parse(last) < LAST_CHECK_INTERVAL_MS) {
    return { ok: true, payload };
  }

  try {
    const res = await fetch(`${env.LICENSE_SERVER_URL.replace(/\/+$/, "")}/v1/heartbeat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: payload.key, domain }),
    });

    if (res.status === 403) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      await deleteLicenseGrant(env);
      return { ok: false, reason: data.error ?? "revoked" };
    }
    if (!res.ok) return { ok: true, payload };

    const data = (await res.json()) as { grant?: string };
    if (!data.grant) return { ok: true, payload };

    const verified = await verifyLicenseGrant(env, data.grant, domain);
    if (!verified.ok) return { ok: true, payload };

    await storeLicenseGrant(env, data.grant);
    await setSetting(env, LICENSE_LAST_CHECK_KEY, new Date().toISOString());
    return { ok: true, payload: verified.payload };
  } catch {
    // License server unreachable: keep the cached grant (grace period).
    return { ok: true, payload };
  }
}

export async function activateLicense(
  env: AppEnv["Bindings"],
  key: string,
  domain: string
): Promise<{ ok: true } | { ok: false; error: string; reason?: string }> {
  if (env.LICENSE_SERVER_URL) {
    try {
      const res = await fetch(`${env.LICENSE_SERVER_URL.replace(/\/+$/, "")}/v1/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key,
          domain,
          product: env.LICENSE_PRODUCT || DEFAULT_LICENSE_PRODUCT,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { grant?: string; error?: string };
      if (!res.ok || !data.grant) {
        return { ok: false, error: data.error ?? "activation_failed" };
      }
      const verified = await verifyLicenseGrant(env, data.grant, domain);
      if (!verified.ok) return { ok: false, error: verified.reason };
      await storeLicenseGrant(env, data.grant);
      await setSetting(env, LICENSE_LAST_CHECK_KEY, new Date().toISOString());
      return { ok: true };
    } catch {
      return { ok: false, error: "server_unreachable" };
    }
  }

  const verified = await verifyLicenseGrant(env, key, domain);
  if (!verified.ok) return { ok: false, error: verified.reason };
  await storeLicenseGrant(env, key);
  return { ok: true };
}

export async function storeLicenseGrant(env: AppEnv["Bindings"], token: string): Promise<void> {
  await db(env).execute({
    sql: `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    args: [LICENSE_SETTING_KEY, token, new Date().toISOString()],
  });
}

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Writes require a license; reads, the storefront, and onboarding stays open. */
export const requireLicensed: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (!WRITE_METHODS.has(c.req.method)) return next();
  if (c.env.LICENSE_DISABLED === "1") return next();

  const status = await getLicenseStatus(c);
  if (!status.licensed) {
    return c.json(
      { error: "Licence requise. Activez votre clé dans le tableau de bord.", code: "UNLICENSED" },
      402
    );
  }
  await next();
};
