import { importJWK, jwtVerify, type JWK } from "jose";
import type { Context, MiddlewareHandler } from "hono";
import type { AppEnv } from "./env";
import { db } from "./db";
import { DEFAULT_LICENSE_PRODUCT, DEFAULT_LICENSE_PUBLIC_KEY } from "./license-defaults";

export const LICENSE_SETTING_KEY = "license_grant";

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

  return {
    ...base,
    licensed: true,
    mode: verified.payload.mode ?? "forever",
    expires_at: verified.payload.exp ? new Date(verified.payload.exp * 1000).toISOString() : null,
    key: verified.payload.key ?? null,
  };
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
