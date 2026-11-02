import { Hono } from "hono";
import type { AppEnv } from "../env";
import {
  getLicenseStatus,
  licenseDomain,
  storeLicenseGrant,
  verifyLicenseGrant,
} from "../license";

const readJson = async <T>(c: { req: { json: () => Promise<unknown> } }): Promise<T | null> => {
  try {
    return (await c.req.json()) as T;
  } catch {
    return null;
  }
};

export const licenseRoutes = (app: Hono<AppEnv>): void => {
  const license = new Hono<AppEnv>();

  license.get("/status", async (c) => c.json(await getLicenseStatus(c)));

  license.post("/activate", async (c) => {
    const body = await readJson<{ key?: string }>(c);
    const token = body?.key?.trim();
    if (!token) return c.json({ error: "La clé de licence est requise." }, 400);

    const domain = licenseDomain(c.env, c.req.url);
    const verified = await verifyLicenseGrant(c.env, token, domain);
    if (!verified.ok) {
      const message =
        verified.reason === "domain_mismatch"
          ? "Cette clé est liée à un autre domaine."
          : verified.reason === "expired"
            ? "Cette clé a expiré."
            : verified.reason === "product_mismatch"
              ? "Cette clé ne correspond pas à ce produit."
              : "Clé de licence invalide.";
      return c.json({ error: message, reason: verified.reason }, 400);
    }

    await storeLicenseGrant(c.env, token);
    return c.json(await getLicenseStatus(c));
  });

  app.route("/license", license);
};
