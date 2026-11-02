import { generateKeyPair, exportJWK } from "jose";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const outDir = process.env.LICENSE_KEY_DIR ?? process.cwd();
mkdirSync(outDir, { recursive: true });

const { publicKey, privateKey } = await generateKeyPair("EdDSA", {
  crv: "Ed25519",
  extractable: true,
});

const publicJwk = await exportJWK(publicKey);
const privateJwk = await exportJWK(privateKey);

const publicPath = join(outDir, "license-public-key.json");
const privatePath = join(outDir, "license-private-key.json");

writeFileSync(publicPath, JSON.stringify(publicJwk, null, 2), "utf8");
writeFileSync(privatePath, JSON.stringify(privateJwk, null, 2), "utf8");

console.log(`Public key written to:  ${publicPath}`);
console.log(`Private key written to: ${privatePath}`);
console.log("");
console.log("PUBLIC JWK (safe to bake into the template):");
console.log(JSON.stringify(publicJwk));
console.log("");
console.log("Keep the private key offline. Never commit it or ship it.");
