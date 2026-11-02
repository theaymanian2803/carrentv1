import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { apiFetch, getToken, setToken, ApiError } from "../api";
import { onAuthFailure } from "../authEvents";

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apiFetch", () => {
  it("prefixes /api and attaches the stored bearer token", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    setToken("abc123");

    await apiFetch("/cars");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/cars");
    expect((init.headers as Headers).get("Authorization")).toBe("Bearer abc123");
  });

  it("clears the token and throws ApiError on 401", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ error: "Unauthorized" }, 401)));
    setToken("stale");

    await expect(apiFetch("/auth/me")).rejects.toBeInstanceOf(ApiError);
    expect(getToken()).toBeNull();
  });

  it("notifies the app when a 401 invalidates the session", async () => {
    const listener = vi.fn();
    const off = onAuthFailure(listener);
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ error: "Unauthorized" }, 401)));
    setToken("stale");

    await expect(apiFetch("/auth/me")).rejects.toBeInstanceOf(ApiError);
    expect(listener).toHaveBeenCalledTimes(1);
    off();
  });

  it("turns a non-JSON error body into an ApiError with the status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("boom", { status: 500, statusText: "Server Error" }))
    );

    await expect(apiFetch("/health")).rejects.toMatchObject({
      status: 500,
    });
  });

  it("does not set Content-Type for FormData bodies", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ url: "/api/media/1" }, 201));
    vi.stubGlobal("fetch", fetchMock);

    const form = new FormData();
    form.append("file", new File(["x"], "x.png", { type: "image/png" }));
    await apiFetch("/me/upload", { method: "POST", formData: form });

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Headers).has("Content-Type")).toBe(false);
  });
});
