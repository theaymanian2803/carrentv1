import { describe, it, expect, vi, afterEach } from "vitest";
import app from "../src/index";
import { makeTestEnv, resetSchema, call } from "./helpers";
import { db } from "../src/db";
import type { Env } from "../src/env";

const googleEnv = (env: Env): Env => ({
  ...env,
  GOOGLE_CLIENT_ID: "google-client.apps.googleusercontent.com",
  GOOGLE_CLIENT_SECRET: "google-secret",
  GOOGLE_REDIRECT_URI: "http://localhost:8080/api/auth/google/callback",
  ADMIN_EMAILS: "boss@example.com",
});

const cookieHeader = (res: Response, only?: string): string =>
  (res.headers.getSetCookie?.() ?? [])
    .map((cookie) => cookie.split(";")[0])
    .filter((cookie) => (only ? cookie.startsWith(only) : true))
    .join("; ");

const cookieValue = (res: Response, name: string): string => {
  const pair = (res.headers.getSetCookie?.() ?? [])
    .map((cookie) => cookie.split(";")[0])
    .find((cookie) => cookie.startsWith(`${name}=`));
  return pair ? decodeURIComponent(pair.slice(name.length + 1)) : "";
};

const stubGoogle = (profile: Record<string, unknown> = {}) => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string | URL) => {
      const target = String(url);
      if (target.includes("oauth2.googleapis.com/token")) {
        return new Response(JSON.stringify({ access_token: "access-token" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (target.includes("openidconnect.googleapis.com")) {
        return new Response(
          JSON.stringify({
            sub: "google-sub-1",
            email: "user@gmail.com",
            email_verified: true,
            name: "Google User",
            picture: "https://img/avatar.png",
            ...profile,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response("{}", { status: 404 });
    })
  );
};

const startGoogle = async (env: Env, cookie = "") => {
  const res = await call(app, env, "/api/auth/google", {
    headers: cookie ? { Cookie: cookie } : {},
  });
  return res;
};

const finishGoogle = async (env: Env, state: string, verifier: string, extraCookie = "") => {
  const cookie = [
    `carshare_oauth_state=${encodeURIComponent(state)}`,
    `carshare_oauth_verifier=${encodeURIComponent(verifier)}`,
    extraCookie,
  ]
    .filter(Boolean)
    .join("; ");
  return call(
    app,
    env,
    `/api/auth/google/callback?code=code-1&state=${encodeURIComponent(state)}`,
    { headers: { Cookie: cookie } }
  );
};

afterEach(() => vi.unstubAllGlobals());

describe("google auth", () => {
  it("redirects to Google with PKCE and stores one-time cookies", async () => {
    const env = googleEnv(await makeTestEnv());
    await resetSchema(env);
    const res = await startGoogle(env);

    expect(res.status).toBe(302);
    const location = new URL(res.headers.get("location") as string);
    expect(location.origin).toBe("https://accounts.google.com");
    expect(location.searchParams.get("client_id")).toBe(env.GOOGLE_CLIENT_ID);
    expect(location.searchParams.get("code_challenge_method")).toBe("S256");
    expect(location.searchParams.get("state")).toBeTruthy();
    expect(location.searchParams.get("redirect_uri")).toBe(env.GOOGLE_REDIRECT_URI);
    expect(cookieValue(res, "carshare_oauth_state")).toBe(location.searchParams.get("state"));
    expect(cookieValue(res, "carshare_oauth_verifier")).toBeTruthy();
  });

  it("creates a user from a verified Google profile and sets a session cookie", async () => {
    const env = googleEnv(await makeTestEnv());
    await resetSchema(env);
    stubGoogle();

    const start = await startGoogle(env);
    const state = cookieValue(start, "carshare_oauth_state");
    const verifier = cookieValue(start, "carshare_oauth_verifier");
    const callback = await finishGoogle(env, state, verifier);

    expect(callback.status).toBe(302);
    expect(callback.headers.get("location")).toContain("/auth?google=success");
    expect(cookieHeader(callback, "carshare_session")).toBeTruthy();

    const { rows } = await db(env).execute({
      sql: "SELECT id, email, google_sub, is_guest FROM users WHERE email = ?",
      args: ["user@gmail.com"],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].google_sub).toBe("google-sub-1");
    expect(Number(rows[0].is_guest)).toBe(0);
  });

  it("does not duplicate a returning Google user", async () => {
    const env = googleEnv(await makeTestEnv());
    await resetSchema(env);
    stubGoogle();

    for (let i = 0; i < 2; i++) {
      const start = await startGoogle(env);
      await finishGoogle(
        env,
        cookieValue(start, "carshare_oauth_state"),
        cookieValue(start, "carshare_oauth_verifier")
      );
    }

    const { rows } = await db(env).execute("SELECT COUNT(*) AS n FROM users");
    expect(Number(rows[0].n)).toBe(1);
  });

  it("upgrades the signed-in guest instead of creating a second account", async () => {
    const env = googleEnv(await makeTestEnv());
    await resetSchema(env);
    stubGoogle({ email: "guest-upgraded@gmail.com" });

    const guest = await call(app, env, "/api/auth/guest", { method: "POST" });
    const guestBody = (await guest.json()) as any;
    const guestCookie = cookieHeader(guest, "carshare_session");

    const start = await startGoogle(env);
    const callback = await finishGoogle(
      env,
      cookieValue(start, "carshare_oauth_state"),
      cookieValue(start, "carshare_oauth_verifier"),
      guestCookie
    );
    expect(callback.status).toBe(302);

    const { rows } = await db(env).execute("SELECT id, email, google_sub, is_guest FROM users");
    expect(rows).toHaveLength(1);
    expect(String(rows[0].id)).toBe(guestBody.user.id);
    expect(Number(rows[0].is_guest)).toBe(0);
    expect(rows[0].email).toBe("guest-upgraded@gmail.com");
    expect(rows[0].google_sub).toBe("google-sub-1");
  });

  it("rejects a callback with a mismatched state", async () => {
    const env = googleEnv(await makeTestEnv());
    await resetSchema(env);
    const res = await call(
      app,
      env,
      "/api/auth/google/callback?code=code-1&state=wrong",
      { headers: { Cookie: "carshare_oauth_state=expected" } }
    );
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toContain("google=error");
  });
});
