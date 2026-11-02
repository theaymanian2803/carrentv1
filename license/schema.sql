-- CarShare license server schema. D1 / SQLite dialect, idempotent.

CREATE TABLE IF NOT EXISTS licenses (
  key          TEXT PRIMARY KEY,
  product      TEXT NOT NULL,
  max_domains  INTEGER NOT NULL DEFAULT 3,
  mode         TEXT NOT NULL DEFAULT 'forever',
  status       TEXT NOT NULL DEFAULT 'active',
  expires_at   TEXT,
  note         TEXT,
  created_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS activations (
  id            TEXT PRIMARY KEY,
  key           TEXT NOT NULL REFERENCES licenses(key),
  domain        TEXT NOT NULL,
  activated_at  TEXT NOT NULL,
  last_seen     TEXT,
  UNIQUE(key, domain)
);

CREATE INDEX IF NOT EXISTS idx_activations_key ON activations(key);
