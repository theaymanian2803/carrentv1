import { Hono } from "hono";
import type { AppEnv } from "../env";
import { db } from "../db";
import { requireAuth } from "../auth";
import {
  createPaypalSubscription,
  getPaypalSubscription,
  paypalConfigured,
  verifyPaypalWebhook,
} from "../lib/paypal";

const now = (): string => new Date().toISOString();
const NOT_CONFIGURED = { error: "Payments not configured" } as const;

const readJson = async <T>(c: { req: { json: () => Promise<unknown> } }): Promise<T | null> => {
  try {
    return (await c.req.json()) as T;
  } catch {
    return null;
  }
};

export const paymentRoutes = (app: Hono<AppEnv>): void => {
  const payments = new Hono<AppEnv>();

  payments.post("/paypal/create-subscription", requireAuth, async (c) => {
    if (!paypalConfigured(c.env) || !c.env.PAYPAL_PLAN_ID) {
      return c.json(NOT_CONFIGURED, 503);
    }
    const body = await readJson<{ return_url?: string; cancel_url?: string }>(c);
    if (!body?.return_url || !body.cancel_url) {
      return c.json({ error: "return_url and cancel_url are required" }, 400);
    }

    try {
      const subscription = await createPaypalSubscription(c.env, {
        returnUrl: body.return_url,
        cancelUrl: body.cancel_url,
        userId: c.get("userId"),
      });
      const approval = subscription.links?.find(
        (link) => link.rel === "approve" || link.rel === "payer-action"
      );

      const taken = await db(c.env).execute({
        sql: "SELECT 1 FROM subscriptions WHERE paypal_subscription_id = ? AND user_id <> ?",
        args: [subscription.id, c.get("userId")],
      });
      if (taken.rows.length) {
        return c.json({ error: "This subscription is already linked to another account" }, 409);
      }
      await db(c.env).execute({
        sql: "UPDATE subscriptions SET paypal_subscription_id = ?, updated_at = ? WHERE user_id = ?",
        args: [subscription.id, now(), c.get("userId")],
      });

      return c.json({
        subscription_id: subscription.id,
        approval_url: approval?.href ?? null,
      });
    } catch (err) {
      console.error("[paypal] create failed:", err instanceof Error ? err.message : err);
      return c.json({ error: "Failed to create subscription" }, 502);
    }
  });

  payments.post("/paypal/activate", requireAuth, async (c) => {
    if (!paypalConfigured(c.env)) return c.json(NOT_CONFIGURED, 503);
    const body = await readJson<{ subscription_id?: string }>(c);
    if (!body?.subscription_id) return c.json({ error: "subscription_id is required" }, 400);

    try {
      const subscription = await getPaypalSubscription(c.env, body.subscription_id);
      if (subscription.status !== "ACTIVE") {
        return c.json({ error: "Subscription is not active yet" }, 400);
      }
      if (!subscription.custom_id || subscription.custom_id !== c.get("userId")) {
        return c.json({ error: "Subscription does not belong to this account" }, 403);
      }
      if (c.env.PAYPAL_PLAN_ID && subscription.plan_id && subscription.plan_id !== c.env.PAYPAL_PLAN_ID) {
        return c.json({ error: "Subscription plan does not match" }, 400);
      }

      const taken = await db(c.env).execute({
        sql: "SELECT 1 FROM subscriptions WHERE paypal_subscription_id = ? AND user_id <> ?",
        args: [subscription.id, c.get("userId")],
      });
      if (taken.rows.length) {
        return c.json({ error: "This subscription is already linked to another account" }, 409);
      }

      const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const result = await db(c.env).execute({
        sql: `UPDATE subscriptions
              SET plan = 'pro', status = 'active', paypal_subscription_id = ?,
                  current_period_start = ?, current_period_end = ?, updated_at = ?
              WHERE user_id = ?`,
        args: [subscription.id, now(), periodEnd, now(), c.get("userId")],
      });
      if (!result.rowsAffected) return c.json({ error: "Subscription row missing" }, 404);
      return c.json({ plan: "pro", status: "active", current_period_end: periodEnd });
    } catch (err) {
      console.error("[paypal] activate failed:", err instanceof Error ? err.message : err);
      return c.json({ error: "Failed to activate subscription" }, 502);
    }
  });

  payments.post("/paypal/webhook", async (c) => {
    if (!paypalConfigured(c.env) || !c.env.PAYPAL_WEBHOOK_ID) {
      return c.json(NOT_CONFIGURED, 503);
    }

    let event: { event_type?: string; resource?: { id?: string; custom_id?: string } };
    try {
      event = (await c.req.json()) as typeof event;
    } catch {
      return c.json({ error: "Invalid JSON body" }, 400);
    }

    const verified = await verifyPaypalWebhook(c.env, {
      authAlgo: c.req.header("paypal-auth-algo") ?? "",
      certUrl: c.req.header("paypal-cert-url") ?? "",
      transmissionId: c.req.header("paypal-transmission-id") ?? "",
      transmissionSig: c.req.header("paypal-transmission-sig") ?? "",
      transmissionTime: c.req.header("paypal-transmission-time") ?? "",
      event,
    });
    if (!verified) return c.json({ error: "Invalid webhook signature" }, 400);

    const changes: Record<string, { plan: string; status: string }> = {
      "BILLING.SUBSCRIPTION.ACTIVATED": { plan: "pro", status: "active" },
      "BILLING.SUBSCRIPTION.CANCELLED": { plan: "pro", status: "cancelled" },
      "BILLING.SUBSCRIPTION.SUSPENDED": { plan: "pro", status: "past_due" },
      "BILLING.SUBSCRIPTION.EXPIRED": { plan: "pro", status: "expired" },
    };
    const change = event.event_type ? changes[event.event_type] : undefined;
    if (!change) return c.json({ ok: true, ignored: true });

    const subscriptionId = event.resource?.id;
    const userId = event.resource?.custom_id;
    const dbc = db(c.env);
    let target = subscriptionId
      ? await dbc.execute({
          sql: "SELECT id FROM subscriptions WHERE paypal_subscription_id = ?",
          args: [subscriptionId],
        })
      : { rows: [] as never[] };

    if (!target.rows.length && userId) {
      target = (await dbc.execute({
        sql: "SELECT id FROM subscriptions WHERE user_id = ?",
        args: [userId],
      })) as typeof target;
    }

    if (!target.rows.length) return c.json({ ok: true, ignored: true });

    await dbc.execute({
      sql: "UPDATE subscriptions SET plan = ?, status = ?, updated_at = ? WHERE id = ?",
      args: [change.plan, change.status, now(), String(target.rows[0].id)],
    });
    return c.json({ ok: true });
  });

  app.route("/payments", payments);
};
