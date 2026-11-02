const BASE = "/api";
export const TOKEN_KEY = "carshare_token";

import { emitAuthFailure } from "./authEvents";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export const getToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setToken = (token: string | null): void => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Storage can be unavailable in private modes; the caller still gets a session for this tab.
  }
};

export interface ApiFetchInit {
  method?: string;
  body?: unknown;
  formData?: FormData;
  headers?: HeadersInit;
}

export async function apiFetch<T>(path: string, init: ApiFetchInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let body: BodyInit | undefined;
  if (init.formData) {
    body = init.formData;
  } else if (init.body !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(init.body);
  }

  const res = await fetch(`${BASE}${path}`, {
    method: init.method ?? "GET",
    headers,
    body,
    credentials: "include",
  });

  if (res.status === 401) {
    setToken(null);
    emitAuthFailure();
  }

  if (!res.ok) {
    let message = res.statusText || `Request failed (${res.status})`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data?.error) message = data.error;
    } catch {
      // Non-JSON error body; keep the status text.
    }
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
