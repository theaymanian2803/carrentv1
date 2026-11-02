/**
 * Public Ed25519 key used to verify license grants. Safe to publish.
 * The matching private key lives outside the repository and is used only by
 * `server/scripts/mint-license.ts`.
 */
export const DEFAULT_LICENSE_PUBLIC_KEY =
  '{"crv":"Ed25519","kty":"OKP","x":"6-hrZAstyAp9_-Dw2TonOYIVUQeQmDJIvLiylVHq-6g"}';

export const DEFAULT_LICENSE_PRODUCT = "carshare";
