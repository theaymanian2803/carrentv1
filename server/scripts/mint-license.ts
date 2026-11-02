import { SignJWT, importJWK, type JWK } from "jose";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const get = (name: string, fallback?: string): string | undefined => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : fallback;
};

const domain = get("domain");
const product = get("product", process.env.LICENSE_PRODUCT ?? "carshare");
const days = Number(get("days", "0"));
const mode = get("mode", "forever");
const keyPath = resolve(
  process.env.LICENSE_PRIVATE_KEY_PATH ?? "license-private-key.json"
);

if (!domain) {
  console.error(
    "Usage: bun run scripts/mint-license.ts --domain shop.example.com [--days 365] [--product carshare] [--mode forever]\n" +
      `Private key path: ${keyPath} (override with LICENSE_PRIVATE_KEY_PATH)`
  );
  process.exit(1);
}

let privateJwk: Record<string, unknown>;
try {
  privateJwk = JSON.parse(readFileSync(keyPath, "utf8")) as Record<string, unknown>;
} catch {
  console.error(`Could not read the private key at ${keyPath}.`);
  console.error("Generate one with: bun run scripts/gen-license-keys.ts");
  process.exit(1);
}

const key = await importJWK(privateJwk as unknown as JWK, "EdDSA");
const licenseKey = `CARSHARE-${crypto.randomUUID().split("-")[0].toUpperCase()}-${crypto
  .randomUUID()
  .split("-")[0]
  .toUpperCase()}`;

let token = new SignJWT({
  key: licenseKey,
  product,
  domain: domain.trim().toLowerCase(),
  mode,
})
  .setProtectedHeader({ alg: "EdDSA", typ: "JWT" })
  .setIssuedAt();

if (days > 0) {
  token = token.setExpirationTime(`${days}d`);
}

const grant = await token.sign(key);
console.log(grant);
console.error(`\nDomain: ${domain} | Product: ${product} | Mode: ${mode} | Days: ${days || "never expires"}`);
