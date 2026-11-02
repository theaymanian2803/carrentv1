import { describe, it, expect } from "bun:test";
import { generateKeyPair, issueGrant, verifyGrant } from "../grant";

describe("grant", () => {
  it("signs and verifies a forever grant", async () => {
    const { publicJwk, privateJwk } = await generateKeyPair();
    const token = await issueGrant(privateJwk, {
      key: "K",
      product: "carshare",
      domain: "a.com",
      mode: "forever",
      iat: 1,
    });
    const p = await verifyGrant(token, publicJwk);
    expect(p.domain).toBe("a.com");
    expect(p.mode).toBe("forever");
    expect(p.exp).toBeUndefined();
  });

  it("carries exp for managed grants", async () => {
    const { publicJwk, privateJwk } = await generateKeyPair();
    const token = await issueGrant(privateJwk, {
      key: "K",
      product: "carshare",
      domain: "a.com",
      mode: "managed",
      iat: 1,
      exp: 9_999_999_999,
    });
    const p = await verifyGrant(token, publicJwk);
    expect(p.exp).toBe(9_999_999_999);
  });

  it("rejects a tampered token", async () => {
    const { publicJwk, privateJwk } = await generateKeyPair();
    const token = await issueGrant(privateJwk, {
      key: "K",
      product: "carshare",
      domain: "a.com",
      mode: "forever",
      iat: 1,
    });
    await expect(verifyGrant(token + "x", publicJwk)).rejects.toThrow();
  });
});
