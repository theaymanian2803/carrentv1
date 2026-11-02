import { Hono } from "hono";
import type { AppEnv } from "../env";
import {
  activateLicense,
  getLicenseStatus,
  licenseDomain,
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
    const result = await activateLicense(c.env, token, domain);
    if (!result.ok) {
      const messages: Record<string, string> = {
        domain_mismatch: "Cette clé est liée à un autre domaine.",
        expired: "Cette clé a expiré.",
        product_mismatch: "Cette clé ne correspond pas à ce produit.",
        product: "Cette clé ne correspond pas à ce produit.",
        revoked: "Cette clé a été révoquée.",
        invalid: "Clé de licence invalide.",
        domain_limit: "Cette clé a atteint sa limite de domaines.",
        server_unreachable: "Le serveur de licences est injoignable. Réessayez.",
        activation_failed: "Activation impossible. Vérifiez la clé.",
      };
      return c.json(
        {
          error: messages[result.error] ?? "Activation impossible.",
          reason: result.error,
        },
        400
      );
    }

    return c.json(await getLicenseStatus(c));
  });

  app.route("/license", license);
};
