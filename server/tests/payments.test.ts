import { describe, it, expect, vi, afterEach } from "vitest";
import app from "../src/index";
import { makeTestEnv, resetSchema, call, seedUser, authHeaders } from "./helpers";
import { db } from "../src/db";
import type { Env } from "../src/env";

const paypalEnv = (env: Env): Env => ({
  ...env,
  PAYPAL_CLIENT_ID: "client",
  PAYPAL_CLIENT_SECRET: "secret",
  PAYPAL_BASE: "https://paypal.test",
  PAYPAL_PLAN_ID: "P-123",
  PAYPAL_WEBHOOK_ID: "WH-123",
});

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

afterEach(() => vi.unstubAllGlobals());

describe("paypal", () => {
  it("returns 503 when PayPal is not configured", async () => {
    const env = await makeTestEnv();
    await resetSchema(env);
    const ownerId = await seedUser(env, "owner@example.com");
    const headers = await authHeaders(env, ownerId);

    const create = await call(app, env, "/api/payments/paypal/create-subscription", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ return_url: "https://app/owner", cancel_url: "https://app/owner" }),
    });
    expect(create.status).toBe(503);
    expect(((await create.json()) as any).error).toBe("Payments not configured");

    const activate = await call(app, env, "/api/payments/paypal/activate", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ subscription_id: "I-1" }),
    });
    expect(activate.status).toBe(503);
  });

  it("requires auth for create and activate", async () => {
    const env = paypalEnv(await makeTestEnv());
    await resetSchema(env);
    const res = await call(app, env, "/api/payments/paypal/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription_id: "I-1" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns the approval URL from PayPal", async () => {
    const env = paypalEnv(await makeTestEnv());
    await resetSchema(env);
    const ownerId = await seedUser(env, "owner@example.com");
    const headers = await authHeaders(env, ownerId);

    let sentBody: Record<string, unknown> | null = null;
    const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const target = String(url);
      if (target.includes("/v1/oauth2/token")) return jsonResponse({ access_token: "token" });
      if (target.includes("/v1/billing/subscriptions")) {
        sentBody = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
        return jsonResponse({
          id: "I-123",
          status: "APPROVAL_PENDING",
          custom_id: ownerId,
          plan_id: "P-123",
          links: [{ rel: "approve", href: "https://paypal.test/approve/I-123" }],
        });
      }
      return jsonResponse({});
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await call(app, env, "/api/payments/paypal/create-subscription", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ return_url: "https://app/owner?subscription=success", cancel_url: "https://app/owner?subscription=cancelled" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.approval_url).toBe("https://paypal.test/approve/I-123");
    expect(body.subscription_id).toBe("I-123");
    expect((sentBody as Record<string, unknown> | null)?.custom_id).toBe(ownerId);

    const stored = await db(env).execute({
      sql: "SELECT paypal_subscription_id FROM subscriptions WHERE user_id = ?",
      args: [ownerId],
    });
    expect(stored.rows[0].paypal_subscription_id).toBe("I-123");
  });

  it("only activates an ACTIVE subscription and upgrades the user", async () => {
    const env = paypalEnv(await makeTestEnv());
    await resetSchema(env);
    const ownerId = await seedUser(env, "owner@example.com");
    const headers = { ...(await authHeaders(env, ownerId)), "Content-Type": "application/json" };

    const mockStatus = (status: string, customId = ownerId) =>
      vi.stubGlobal(
        "fetch",
        vi.fn(async (url: string | URL) => {
          const target = String(url);
          if (target.includes("/v1/oauth2/token")) return jsonResponse({ access_token: "token" });
          if (target.includes("/v1/billing/subscriptions/")) {
            return jsonResponse({ id: "I-123", status, custom_id: customId, plan_id: "P-123" });
          }
          return jsonResponse({});
        })
      );

    mockStatus("SUSPENDED");
    const suspended = await call(app, env, "/api/payments/paypal/activate", {
      method: "POST",
      headers,
      body: JSON.stringify({ subscription_id: "I-123" }),
    });
    expect(suspended.status).toBe(400);

    mockStatus("ACTIVE");
    const active = await call(app, env, "/api/payments/paypal/activate", {
      method: "POST",
      headers,
      body: JSON.stringify({ subscription_id: "I-123" }),
    });
    expect(active.status).toBe(200);

    const { rows } = await db(env).execute({
      sql: "SELECT plan, status, paypal_subscription_id, current_period_end FROM subscriptions WHERE user_id = ?",
      args: [ownerId],
    });
    expect(rows[0].plan).toBe("pro");
    expect(rows[0].status).toBe("active");
    expect(rows[0].paypal_subscription_id).toBe("I-123");
    expect(rows[0].current_period_end).toBeTruthy();
  });

  it("rejects another user's subscription and a reused PayPal id", async () => {
    const env = paypalEnv(await makeTestEnv());
    await resetSchema(env);
    const ownerId = await seedUser(env, "owner@example.com");
    const otherId = await seedUser(env, "other@example.com");
    const headers = { ...(await authHeaders(env, ownerId)), "Content-Type": "application/json" };

    const mockWith = (customId: string) =>
      vi.stubGlobal(
        "fetch",
        vi.fn(async (url: string | URL) => {
          const target = String(url);
          if (target.includes("/v1/oauth2/token")) return jsonResponse({ access_token: "token" });
          if (target.includes("/v1/billing/subscriptions/")) {
            return jsonResponse({ id: "I-777", status: "ACTIVE", custom_id: customId, plan_id: "P-123" });
          }
          return jsonResponse({});
        })
      );

    mockWith(otherId);
    const mismatched = await call(app, env, "/api/payments/paypal/activate", {
      method: "POST",
      headers,
      body: JSON.stringify({ subscription_id: "I-777" }),
    });
    expect(mismatched.status).toBe(403);

    await db(env).execute({
      sql: "UPDATE subscriptions SET paypal_subscription_id = 'I-777' WHERE user_id = ?",
      args: [otherId],
    });
    mockWith(ownerId);
    const reused = await call(app, env, "/api/payments/paypal/activate", {
      method: "POST",
      headers,
      body: JSON.stringify({ subscription_id: "I-777" }),
    });
    expect(reused.status).toBe(409);
  });

  it("finds a subscription by custom_id when no PayPal id is stored", async () => {
    const env = paypalEnv(await makeTestEnv());
    await resetSchema(env);
    const ownerId = await seedUser(env, "owner@example.com");
    await db(env).execute({
      sql: "UPDATE subscriptions SET plan = 'pro', status = 'active' WHERE user_id = ?",
      args: [ownerId],
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL) => {
        if (String(url).includes("/v1/oauth2/token")) return jsonResponse({ access_token: "token" });
        if (String(url).includes("verify-webhook-signature")) {
          return jsonResponse({ verification_status: "SUCCESS" });
        }
        return jsonResponse({});
      })
    );

    const res = await call(app, env, "/api/payments/paypal/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "paypal-auth-algo": "SHA256withRSA",
        "paypal-cert-url": "https://paypal.test/cert",
        "paypal-transmission-id": "t-2",
        "paypal-transmission-sig": "sig",
        "paypal-transmission-time": "2026-01-01T00:00:00Z",
      },
      body: JSON.stringify({
        event_type: "BILLING.SUBSCRIPTION.CANCELLED",
        resource: { custom_id: ownerId },
      }),
    });
    expect(res.status).toBe(200);

    const { rows } = await db(env).execute({
      sql: "SELECT status FROM subscriptions WHERE user_id = ?",
      args: [ownerId],
    });
    expect(rows[0].status).toBe("cancelled");
  });

  it("rejects a failed webhook signature and applies a verified cancellation", async () => {
    const env = paypalEnv(await makeTestEnv());
    await resetSchema(env);
    const ownerId = await seedUser(env, "owner@example.com");
    await db(env).execute({
      sql: "UPDATE subscriptions SET plan = 'pro', status = 'active', paypal_subscription_id = 'I-999' WHERE user_id = ?",
      args: [ownerId],
    });

    const webhookHeaders = {
      "Content-Type": "application/json",
      "paypal-auth-algo": "SHA256withRSA",
      "paypal-cert-url": "https://paypal.test/cert",
      "paypal-transmission-id": "t-1",
      "paypal-transmission-sig": "sig",
      "paypal-transmission-time": "2026-01-01T00:00:00Z",
    };

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL) => {
        if (String(url).includes("/v1/oauth2/token")) return jsonResponse({ access_token: "token" });
        if (String(url).includes("verify-webhook-signature")) {
          return jsonResponse({ verification_status: "FAILURE" });
        }
        return jsonResponse({});
      })
    );
    const failed = await call(app, env, "/api/payments/paypal/webhook", {
      method: "POST",
      headers: webhookHeaders,
      body: JSON.stringify({
        event_type: "BILLING.SUBSCRIPTION.CANCELLED",
        resource: { id: "I-999" },
      }),
    });
    expect(failed.status).toBe(400);

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL) => {
        if (String(url).includes("/v1/oauth2/token")) return jsonResponse({ access_token: "token" });
        if (String(url).includes("verify-webhook-signature")) {
          return jsonResponse({ verification_status: "SUCCESS" });
        }
        return jsonResponse({});
      })
    );
    const ok = await call(app, env, "/api/payments/paypal/webhook", {
      method: "POST",
      headers: webhookHeaders,
      body: JSON.stringify({
        event_type: "BILLING.SUBSCRIPTION.CANCELLED",
        resource: { id: "I-999" },
      }),
    });
    expect(ok.status).toBe(200);

    const { rows } = await db(env).execute({
      sql: "SELECT status FROM subscriptions WHERE user_id = ?",
      args: [ownerId],
    });
    expect(rows[0].status).toBe("cancelled");
  });
});
