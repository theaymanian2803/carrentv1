import { describe, it, expect } from "vitest";
import { SignJWT, exportJWK, generateKeyPair, type JWK, type KeyLike } from "jose";
import app from "../src/index";
import { makeTestEnv, resetSchema, call, seedUser, authHeaders } from "./helpers";
import { db } from "../src/db";
import type { Env } from "../src/env";

const { publicKey, privateKey } = await generateKeyPair("EdDSA", {
  crv: "Ed25519",
  extractable: true,
});
const publicJwk = (await exportJWK(publicKey)) as JWK;

const licenseEnv = (env: Env): Env => ({
  ...env,
  LICENSE_DISABLED: undefined,
  LICENSE_PUBLIC_KEY: JSON.stringify(publicJwk),
  LICENSE_PRODUCT: "carshare",
  APP_ORIGIN: "http://localhost:8080",
});

const mint = async (input: {
  domain?: string;
  product?: string;
  expiresAt?: number;
  signer?: KeyLike;
} = {}): Promise<string> =>
  new SignJWT({
    key: "CARSHARE-TEST",
    product: input.product ?? "carshare",
    domain: input.domain ?? "localhost",
    mode: "forever",
  })
    .setProtectedHeader({ alg: "EdDSA" })
    .setIssuedAt()
    .setExpirationTime(input.expiresAt ?? "30d")
    .sign(input.signer ?? privateKey);

const activate = async (env: Env, key: string) =>
  call(app, env, "/api/license/activate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  });

describe("licensing", () => {
  it("reports unlicensed and blocks admin writes until a valid key is activated", async () => {
    const env = licenseEnv(await makeTestEnv());
    await resetSchema(env);
    const adminId = await seedUser(env, "admin@example.com", "admin");
    const headers = { ...(await authHeaders(env, adminId)), "Content-Type": "application/json" };

    const status = await call(app, env, "/api/license/status");
    expect(status.status).toBe(200);
    expect(((await status.json()) as any).licensed).toBe(false);

    const write = await call(app, env, "/api/admin/landing-sections", {
      method: "POST",
      headers,
      body: JSON.stringify({ section_type: "car_row", title: "SUVs" }),
    });
    expect(write.status).toBe(402);

    const read = await call(app, env, "/api/admin/users", {
      headers: { Authorization: headers.Authorization as string },
    });
    expect(read.status).toBe(200);

    const activated = await activate(env, await mint());
    expect(activated.status).toBe(200);
    expect(((await activated.json()) as any).licensed).toBe(true);

    const writeAfter = await call(app, env, "/api/admin/landing-sections", {
      method: "POST",
      headers,
      body: JSON.stringify({ section_type: "car_row", title: "SUVs" }),
    });
    expect(writeAfter.status).toBe(201);

    const { rows } = await db(env).execute({
      sql: "SELECT value FROM settings WHERE key = 'license_grant'",
      args: [],
    });
    expect(rows).toHaveLength(1);
  });

  it("rejects a forged key", async () => {
    const env = licenseEnv(await makeTestEnv());
    await resetSchema(env);
    const other = await generateKeyPair("EdDSA", { crv: "Ed25519", extractable: true });

    const res = await activate(env, await mint({ signer: other.privateKey }));
    expect(res.status).toBe(400);
  });

  it("rejects a key bound to another domain", async () => {
    const env = licenseEnv(await makeTestEnv());
    await resetSchema(env);
    const res = await activate(env, await mint({ domain: "other.example.com" }));
    expect(res.status).toBe(400);
    expect(((await res.json()) as any).reason).toBe("domain_mismatch");
  });

  it("rejects an expired key", async () => {
    const env = licenseEnv(await makeTestEnv());
    await resetSchema(env);
    const res = await activate(env, await mint({ expiresAt: Math.floor(Date.now() / 1000) - 60 }));
    expect(res.status).toBe(400);
    expect(((await res.json()) as any).reason).toBe("expired");
  });

  it("rejects a key for another product", async () => {
    const env = licenseEnv(await makeTestEnv());
    await resetSchema(env);
    const res = await activate(env, await mint({ product: "petpaw" }));
    expect(res.status).toBe(400);
    expect(((await res.json()) as any).reason).toBe("product_mismatch");
  });

  it("allows writes when licensing is disabled for development", async () => {
    const env = await makeTestEnv();
    await resetSchema(env);
    const adminId = await seedUser(env, "admin@example.com", "admin");
    const headers = { ...(await authHeaders(env, adminId)), "Content-Type": "application/json" };

    const res = await call(app, env, "/api/admin/landing-sections", {
      method: "POST",
      headers,
      body: JSON.stringify({ section_type: "car_row", title: "SUVs" }),
    });
    expect(res.status).toBe(201);
  });
});
