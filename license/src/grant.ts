import { SignJWT, jwtVerify, importJWK, exportJWK, generateKeyPair as joseGenerate } from "jose";

export type GrantMode = "forever" | "managed";

export type GrantPayload = {
  key: string;
  product: string;
  domain: string;
  mode: GrantMode;
  iat: number;
  exp?: number;
};

/** Generates an Ed25519 keypair as JWK JSON strings (public + private). */
export async function generateKeyPair(): Promise<{ publicJwk: string; privateJwk: string }> {
  const { publicKey, privateKey } = await joseGenerate("EdDSA", { crv: "Ed25519", extractable: true });
  return {
    publicJwk: JSON.stringify(await exportJWK(publicKey)),
    privateJwk: JSON.stringify(await exportJWK(privateKey)),
  };
}

/** Issues a compact EdDSA JWT bound to a product + domain. */
export async function issueGrant(privateJwk: string, payload: GrantPayload): Promise<string> {
  const key = await importJWK(JSON.parse(privateJwk), "EdDSA");
  const jwt = new SignJWT({
    key: payload.key,
    product: payload.product,
    domain: payload.domain,
    mode: payload.mode,
  })
    .setProtectedHeader({ alg: "EdDSA" })
    .setIssuedAt(payload.iat);
  if (payload.exp) jwt.setExpirationTime(payload.exp);
  return jwt.sign(key);
}

/** Verifies a grant's signature and returns its payload (throws on failure). */
export async function verifyGrant(token: string, publicJwk: string): Promise<GrantPayload> {
  const key = await importJWK(JSON.parse(publicJwk), "EdDSA");
  const { payload } = await jwtVerify(token, key, { algorithms: ["EdDSA"] });
  return payload as unknown as GrantPayload;
}
