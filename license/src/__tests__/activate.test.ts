import { describe, it, expect } from "bun:test";
import { createApp } from "../app";
import { memoryStore, type LicenseRow } from "../store";
import { generateKeyPair, verifyGrant } from "../grant";

const NOW = Date.now();

const read = async (r: Response): Promise<any> => await r.json();

async function harness() {
  const { publicJwk, privateJwk } = await generateKeyPair();
  const store = memoryStore();
  const app = createApp({ store, privateJwk, adminPassword: "pw", now: () => NOW });
  const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
    app.request(path, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    });
  return { app, store, publicJwk, post };
}

const baseLicense = (over: Partial<LicenseRow> = {}): LicenseRow => ({
  key: "CARSHARE-TEST-KEY-0001",
  product: "carshare",
  max_domains: 3,
  mode: "forever",
  status: "active",
  expires_at: null,
  note: null,
  created_at: new Date(NOW).toISOString(),
  ...over,
});

describe("license server /v1/activate", () => {
  it("rejects an unknown key", async () => {
    const h = await harness();
    const res = await h.post("/v1/activate", { key: "NOPE", domain: "a.com", product: "carshare" });
    expect(res.status).toBe(400);
    expect((await read(res)).error).toBe("invalid");
  });

  it("rejects a product mismatch", async () => {
    const h = await harness();
    await h.store.createLicense(baseLicense());
    const res = await h.post("/v1/activate", { key: "CARSHARE-TEST-KEY-0001", domain: "a.com", product: "other" });
    expect((await read(res)).error).toBe("product");
  });

  it("binds the first domain and returns a verifiable forever grant", async () => {
    const h = await harness();
    await h.store.createLicense(baseLicense());
    const res = await h.post("/v1/activate", {
      key: "CARSHARE-TEST-KEY-0001",
      domain: "Shop.Example.com:443",
      product: "carshare",
    });
    expect(res.status).toBe(200);
    const body = await read(res);
    expect(body.mode).toBe("forever");
    expect(body.domains_used).toBe(1);
    const p = await verifyGrant(body.grant, h.publicJwk);
    expect(p.domain).toBe("shop.example.com");
    expect(p.exp).toBeUndefined();
  });

  it("re-activating the same domain is free", async () => {
    const h = await harness();
    await h.store.createLicense(baseLicense());
    await h.post("/v1/activate", { key: "CARSHARE-TEST-KEY-0001", domain: "a.com", product: "carshare" });
    const res = await h.post("/v1/activate", { key: "CARSHARE-TEST-KEY-0001", domain: "a.com", product: "carshare" });
    expect((await read(res)).domains_used).toBe(1);
  });

  it("allows 3 domains then returns domain_limit on the 4th", async () => {
    const h = await harness();
    await h.store.createLicense(baseLicense());
    for (const d of ["a.com", "b.com", "c.com"]) {
      const r = await h.post("/v1/activate", { key: "CARSHARE-TEST-KEY-0001", domain: d, product: "carshare" });
      expect(r.status).toBe(200);
    }
    const res = await h.post("/v1/activate", { key: "CARSHARE-TEST-KEY-0001", domain: "d.com", product: "carshare" });
    expect(res.status).toBe(409);
    expect((await read(res)).error).toBe("domain_limit");
  });

  it("issues exp for managed mode", async () => {
    const h = await harness();
    await h.store.createLicense(baseLicense({ mode: "managed" }));
    const res = await h.post("/v1/activate", { key: "CARSHARE-TEST-KEY-0001", domain: "a.com", product: "carshare" });
    const p = await verifyGrant((await read(res)).grant, h.publicJwk);
    expect(p.exp).toBeGreaterThan(Math.floor(NOW / 1000));
  });

  it("rejects a revoked key", async () => {
    const h = await harness();
    await h.store.createLicense(baseLicense({ status: "revoked" }));
    const res = await h.post("/v1/activate", { key: "CARSHARE-TEST-KEY-0001", domain: "a.com", product: "carshare" });
    expect((await read(res)).error).toBe("revoked");
  });

  it("rejects an expired key", async () => {
    const h = await harness();
    await h.store.createLicense(baseLicense({ expires_at: new Date(NOW - 1000).toISOString() }));
    const res = await h.post("/v1/activate", { key: "CARSHARE-TEST-KEY-0001", domain: "a.com", product: "carshare" });
    expect((await read(res)).error).toBe("expired");
  });
});

describe("license server /v1/heartbeat", () => {
  it("403s for a revoked key", async () => {
    const h = await harness();
    await h.store.createLicense(baseLicense({ status: "revoked" }));
    const res = await h.post("/v1/heartbeat", { key: "CARSHARE-TEST-KEY-0001", domain: "a.com" });
    expect(res.status).toBe(403);
  });

  it("refreshes for an activated domain", async () => {
    const h = await harness();
    await h.store.createLicense(baseLicense());
    await h.post("/v1/activate", { key: "CARSHARE-TEST-KEY-0001", domain: "a.com", product: "carshare" });
    const res = await h.post("/v1/heartbeat", { key: "CARSHARE-TEST-KEY-0001", domain: "a.com" });
    expect(res.status).toBe(200);
    expect((await read(res)).grant).toBeTruthy();
  });
});

describe("license server /v1/deactivate", () => {
  it("requires the admin password and frees a slot", async () => {
    const h = await harness();
    await h.store.createLicense(baseLicense());
    await h.post("/v1/activate", { key: "CARSHARE-TEST-KEY-0001", domain: "a.com", product: "carshare" });

    const noAuth = await h.post("/v1/deactivate", { key: "CARSHARE-TEST-KEY-0001", domain: "a.com" });
    expect(noAuth.status).toBe(401);

    const ok = await h.post(
      "/v1/deactivate",
      { key: "CARSHARE-TEST-KEY-0001", domain: "a.com" },
      { "x-admin-password": "pw" },
    );
    expect(ok.status).toBe(200);
    expect(await h.store.countActivations("CARSHARE-TEST-KEY-0001")).toBe(0);
  });
});
