import type { Env } from "../env";

const base = (env: Env): string => env.PAYPAL_BASE ?? "https://api-m.sandbox.paypal.com";

export const paypalConfigured = (env: Env): boolean =>
  Boolean(env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET);

export async function paypalToken(env: Env): Promise<string> {
  const res = await fetch(`${base(env)}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = (await res.json()) as { access_token?: string };
  if (!res.ok || !data.access_token) throw new Error("Failed to get PayPal access token");
  return data.access_token;
}

async function paypalRequest<T>(env: Env, path: string, init: RequestInit = {}): Promise<T> {
  const token = await paypalToken(env);
  const res = await fetch(`${base(env)}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  const data = (await res.json()) as T & { message?: string };
  if (!res.ok) throw new Error(data.message ?? `PayPal request failed (${res.status})`);
  return data;
}

export interface PaypalSubscription {
  id: string;
  status: string;
  links?: { rel: string; href: string }[];
}

export async function createPaypalSubscription(
  env: Env,
  input: { returnUrl: string; cancelUrl: string }
): Promise<PaypalSubscription> {
  return paypalRequest<PaypalSubscription>(env, "/v1/billing/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      plan_id: env.PAYPAL_PLAN_ID,
      application_context: {
        brand_name: "CarShare Connect",
        user_action: "SUBSCRIBE_NOW",
        return_url: input.returnUrl,
        cancel_url: input.cancelUrl,
      },
    }),
  });
}

export async function getPaypalSubscription(env: Env, id: string): Promise<PaypalSubscription> {
  return paypalRequest<PaypalSubscription>(env, `/v1/billing/subscriptions/${id}`);
}

export async function verifyPaypalWebhook(
  env: Env,
  input: {
    authAlgo: string;
    certUrl: string;
    transmissionId: string;
    transmissionSig: string;
    transmissionTime: string;
    event: unknown;
  }
): Promise<boolean> {
  const data = await paypalRequest<{ verification_status?: string }>(
    env,
    "/v1/notifications/verify-webhook-signature",
    {
      method: "POST",
      body: JSON.stringify({
        auth_algo: input.authAlgo,
        cert_url: input.certUrl,
        transmission_id: input.transmissionId,
        transmission_sig: input.transmissionSig,
        transmission_time: input.transmissionTime,
        webhook_id: env.PAYPAL_WEBHOOK_ID,
        webhook_event: input.event,
      }),
    }
  );
  return data.verification_status === "SUCCESS";
}
