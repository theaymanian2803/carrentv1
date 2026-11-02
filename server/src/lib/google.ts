import type { Client } from "@libsql/client";
import type { Env } from "../env";
import { hashPassword } from "../password";
import { ensureUserRecords, grantAdminRole } from "./users";

const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

const encoder = new TextEncoder();

const base64UrlEncode = (bytes: Uint8Array): string => {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

export const randomToken = (byteLength = 32): string => {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
};

export const codeChallenge = async (verifier: string): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(verifier));
  return base64UrlEncode(new Uint8Array(digest));
};

export const googleConfigured = (env: Env): boolean =>
  Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

export const appOrigin = (env: Env, requestUrl: string): string => {
  if (env.APP_ORIGIN) return env.APP_ORIGIN.replace(/\/+$/, "");
  if (env.GOOGLE_REDIRECT_URI) return new URL(env.GOOGLE_REDIRECT_URI).origin;
  return new URL(requestUrl).origin;
};

export const googleRedirectUri = (env: Env, requestUrl: string): string =>
  env.GOOGLE_REDIRECT_URI ?? `${appOrigin(env, requestUrl)}/api/auth/google/callback`;

export const googleAuthorizeUrl = (
  env: Env,
  input: { redirectUri: string; state: string; challenge: string }
): string => {
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID as string,
    redirect_uri: input.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state: input.state,
    code_challenge: input.challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
};

export async function exchangeGoogleCode(
  env: Env,
  input: { code: string; verifier: string; redirectUri: string }
): Promise<string> {
  const body = new URLSearchParams({
    code: input.code,
    client_id: env.GOOGLE_CLIENT_ID as string,
    client_secret: env.GOOGLE_CLIENT_SECRET as string,
    redirect_uri: input.redirectUri,
    grant_type: "authorization_code",
    code_verifier: input.verifier,
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    console.error("[auth] Google token exchange failed:", res.status);
    throw new Error("token_exchange_failed");
  }
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("token_exchange_failed");
  return data.access_token;
}

export interface GoogleProfile {
  sub: string;
  email: string;
  name: string | null;
  picture: string | null;
}

export async function fetchGoogleProfile(accessToken: string): Promise<GoogleProfile> {
  const res = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    console.error("[auth] Google userinfo failed:", res.status);
    throw new Error("profile_fetch_failed");
  }
  const data = (await res.json()) as {
    sub?: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
  };
  if (!data.sub || !data.email || data.email_verified !== true) {
    throw new Error("profile_incomplete");
  }
  return {
    sub: data.sub,
    email: data.email.trim().toLowerCase(),
    name: data.name?.trim() || null,
    picture: data.picture || null,
  };
}

const adminEmails = (env: Env): string[] =>
  (env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

/**
 * Finds or creates the local user for a Google profile.
 * Matches google_sub first, then email, then upgrades a signed-in guest.
 */
export async function upsertGoogleUser(
  env: Env,
  d: Client,
  profile: GoogleProfile,
  currentUserId: string | null
): Promise<string> {
  const bySub = await d.execute({
    sql: "SELECT id FROM users WHERE google_sub = ?",
    args: [profile.sub],
  });

  let userId: string | null = bySub.rows.length ? String(bySub.rows[0].id) : null;

  if (userId) {
    await d.execute({
      sql: "UPDATE users SET email = ?, name = COALESCE(?, name), is_guest = 0 WHERE id = ?",
      args: [profile.email, profile.name, userId],
    });
  } else {
    const byEmail = await d.execute({
      sql: "SELECT id FROM users WHERE email = ? COLLATE NOCASE",
      args: [profile.email],
    });

    if (byEmail.rows.length) {
      userId = String(byEmail.rows[0].id);
      await d.execute({
        sql: "UPDATE users SET google_sub = ?, name = COALESCE(?, name), is_guest = 0 WHERE id = ?",
        args: [profile.sub, profile.name, userId],
      });
    } else if (currentUserId) {
      const current = await d.execute({
        sql: "SELECT id, is_guest FROM users WHERE id = ?",
        args: [currentUserId],
      });
      if (current.rows.length && Number(current.rows[0].is_guest) === 1) {
        userId = currentUserId;
        await d.execute({
          sql: "UPDATE users SET email = ?, google_sub = ?, name = COALESCE(?, name), is_guest = 0 WHERE id = ?",
          args: [profile.email, profile.sub, profile.name, userId],
        });
      }
    }
  }

  if (!userId) {
    userId = crypto.randomUUID();
    const passwordHash = await hashPassword(randomToken(24));
    await d.execute({
      sql: `INSERT INTO users (id, email, password_hash, name, google_sub, is_guest, created_at)
            VALUES (?, ?, ?, ?, ?, 0, ?)`,
      args: [userId, profile.email, passwordHash, profile.name, profile.sub, new Date().toISOString()],
    });
  }

  await ensureUserRecords(d, { id: userId, email: profile.email, name: profile.name });

  if (profile.picture) {
    await d.execute({
      sql: "UPDATE profiles SET avatar_url = COALESCE(avatar_url, ?) WHERE user_id = ?",
      args: [profile.picture, userId],
    });
  }

  if (adminEmails(env).includes(profile.email)) {
    await grantAdminRole(d, userId);
  }

  return userId;
}
