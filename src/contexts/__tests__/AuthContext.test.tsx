import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { AuthProvider, useAuth } from "../AuthContext";
import { data } from "@/lib/data";

vi.mock("@/lib/data", () => ({
  data: {
    auth: {
      me: vi.fn(),
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      getToken: vi.fn(),
    },
  },
}));

const auth = data.auth as unknown as {
  me: ReturnType<typeof vi.fn>;
  login: ReturnType<typeof vi.fn>;
  register: ReturnType<typeof vi.fn>;
  logout: ReturnType<typeof vi.fn>;
  getToken: ReturnType<typeof vi.fn>;
};

const profile = {
  id: "p1",
  full_name: "Owner One",
  avatar_url: null,
  kyc_status: "pending" as const,
  stripe_account_id: null,
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
};

const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>;

beforeEach(() => {
  vi.clearAllMocks();
  auth.getToken.mockReturnValue(null);
  auth.me.mockResolvedValue({
    user: { id: "u1", email: "owner@example.com", fullName: "Owner One" },
    profile,
    roles: ["owner"],
  });
});

describe("AuthContext", () => {
  it("restores a session from a stored token", async () => {
    auth.getToken.mockReturnValue("token");
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user?.id).toBe("u1");
    expect(result.current.profile?.full_name).toBe("Owner One");
    expect(result.current.roles).toEqual(["owner"]);
  });

  it("clears a bad session instead of hanging in loading", async () => {
    auth.getToken.mockReturnValue("stale");
    auth.me.mockRejectedValue(Object.assign(new Error("Unauthorized"), { status: 401 }));
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
    expect(auth.logout).toHaveBeenCalled();
  });

  it("signs in and exposes the user", async () => {
    auth.login.mockResolvedValue({
      token: "new-token",
      user: { id: "u1", email: "owner@example.com", fullName: "Owner One" },
    });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.signIn("owner@example.com", "password123");
    });

    expect(auth.login).toHaveBeenCalledWith({
      email: "owner@example.com",
      password: "password123",
    });
    expect(result.current.user?.email).toBe("owner@example.com");
  });

  it("signs out and resets state", async () => {
    auth.getToken.mockReturnValue("token");
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.user).not.toBeNull());

    await act(async () => {
      await result.current.signOut();
    });

    expect(auth.logout).toHaveBeenCalled();
    expect(result.current.user).toBeNull();
    expect(result.current.roles).toEqual([]);
  });

  it("checks roles", async () => {
    auth.getToken.mockReturnValue("token");
    auth.me.mockResolvedValue({
      user: { id: "u1", email: "admin@example.com", fullName: "Admin" },
      profile,
      roles: ["admin"],
    });
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasRole("admin")).toBe(true);
    expect(result.current.hasRole("owner")).toBe(false);
  });
});
