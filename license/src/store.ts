export type LicenseMode = "forever" | "managed";
export type LicenseStatus = "active" | "revoked";

export type LicenseRow = {
  key: string;
  product: string;
  max_domains: number;
  mode: LicenseMode;
  status: LicenseStatus;
  expires_at: string | null;
  note: string | null;
  created_at: string;
};

export type ActivationRow = {
  id: string;
  key: string;
  domain: string;
  activated_at: string;
  last_seen: string | null;
};

export interface Store {
  getLicense(key: string): Promise<LicenseRow | null>;
  createLicense(row: LicenseRow): Promise<void>;
  listLicenses(): Promise<LicenseRow[]>;
  updateLicense(key: string, patch: Partial<Omit<LicenseRow, "key" | "created_at">>): Promise<void>;
  listActivations(key: string): Promise<ActivationRow[]>;
  getActivation(key: string, domain: string): Promise<ActivationRow | null>;
  countActivations(key: string): Promise<number>;
  recordActivation(key: string, domain: string, now: string): Promise<void>;
  releaseActivation(key: string, domain: string): Promise<void>;
}

/** D1-backed store used in production. */
export function d1Store(db: D1Database): Store {
  return {
    async getLicense(key) {
      return (await db.prepare("SELECT * FROM licenses WHERE key = ?").bind(key).first<LicenseRow>()) ?? null;
    },
    async createLicense(row) {
      await db
        .prepare(
          "INSERT INTO licenses (key, product, max_domains, mode, status, expires_at, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(row.key, row.product, row.max_domains, row.mode, row.status, row.expires_at, row.note, row.created_at)
        .run();
    },
    async listLicenses() {
      const r = await db.prepare("SELECT * FROM licenses ORDER BY created_at DESC").all<LicenseRow>();
      return r.results ?? [];
    },
    async updateLicense(key, patch) {
      const fields: string[] = [];
      const args: unknown[] = [];
      for (const [k, v] of Object.entries(patch)) {
        fields.push(`${k} = ?`);
        args.push(v as string | number | null);
      }
      if (!fields.length) return;
      await db
        .prepare(`UPDATE licenses SET ${fields.join(", ")} WHERE key = ?`)
        .bind(...args, key)
        .run();
    },
    async listActivations(key) {
      const r = await db
        .prepare("SELECT * FROM activations WHERE key = ? ORDER BY activated_at")
        .bind(key)
        .all<ActivationRow>();
      return r.results ?? [];
    },
    async getActivation(key, domain) {
      return (
        (await db
          .prepare("SELECT * FROM activations WHERE key = ? AND domain = ?")
          .bind(key, domain)
          .first<ActivationRow>()) ?? null
      );
    },
    async countActivations(key) {
      const r = await db
        .prepare("SELECT COUNT(*) AS n FROM activations WHERE key = ?")
        .bind(key)
        .first<{ n: number }>();
      return Number(r?.n ?? 0);
    },
    async recordActivation(key, domain, now) {
      await db
        .prepare(
          "INSERT INTO activations (id, key, domain, activated_at, last_seen) VALUES (?, ?, ?, ?, ?) ON CONFLICT(key, domain) DO UPDATE SET last_seen = excluded.last_seen",
        )
        .bind(crypto.randomUUID(), key, domain, now, now)
        .run();
    },
    async releaseActivation(key, domain) {
      await db.prepare("DELETE FROM activations WHERE key = ? AND domain = ?").bind(key, domain).run();
    },
  };
}

/** In-memory store for tests and local dev. */
export function memoryStore(): Store {
  const licenses = new Map<string, LicenseRow>();
  const activations: ActivationRow[] = [];
  return {
    async getLicense(key) {
      return licenses.get(key) ?? null;
    },
    async createLicense(row) {
      licenses.set(row.key, { ...row });
    },
    async listLicenses() {
      return [...licenses.values()];
    },
    async updateLicense(key, patch) {
      const cur = licenses.get(key);
      if (cur) licenses.set(key, { ...cur, ...patch });
    },
    async listActivations(key) {
      return activations.filter((a) => a.key === key);
    },
    async getActivation(key, domain) {
      return activations.find((a) => a.key === key && a.domain === domain) ?? null;
    },
    async countActivations(key) {
      return activations.filter((a) => a.key === key).length;
    },
    async recordActivation(key, domain, now) {
      const existing = activations.find((a) => a.key === key && a.domain === domain);
      if (existing) existing.last_seen = now;
      else activations.push({ id: crypto.randomUUID(), key, domain, activated_at: now, last_seen: now });
    },
    async releaseActivation(key, domain) {
      const i = activations.findIndex((a) => a.key === key && a.domain === domain);
      if (i >= 0) activations.splice(i, 1);
    },
  };
}
