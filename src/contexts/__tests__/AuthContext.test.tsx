import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { AuthProvider, useAuth } from "../AuthContext";
import { data } from "@/lib/data";
import { emitAuthFailure } from "@/lib/authEvents";

vi.mock("@/lib/data", () => ({
  data: {
    auth: {
      me: vi.fn(),
      login: vi.fn(),
      register: vi.fn(),
      guest: vi.fn(),
      logout: vi.fn(),
      getToken: vi.fn(),
    },
  },
}));

const auth = data.auth as unknown as {
  me: ReturnType<typeof vi.fn>;
  login: ReturnType<typeof vi.fn>;
  register: ReturnType<typeof vi.fn>;
  guest: ReturnType<typeof vi.fn>;
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

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>{children}</AuthProvider>
  </QueryClientProvider>
);

beforeEach(() => {
  queryClient.clear();
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

  it("starts a guest session", async () => {
    auth.guest.mockResolvedValue({
      token: "guest-token",
      user: {
        id: "g1",
        email: "guest-abc@guests.carshare.local",
        fullName: "Invité",
        isGuest: true,
      },
    });
    auth.me.mockResolvedValue({
      user: {
        id: "g1",
        email: "guest-abc@guests.carshare.local",
        fullName: "Invité",
        isGuest: true,
      },
      profile: { ...profile, full_name: "Invité" },
      roles: ["renter"],
    });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.continueAsGuest();
    });

    expect(auth.guest).toHaveBeenCalledTimes(1);
    expect(result.current.user?.isGuest).toBe(true);
    expect(result.current.roles).toEqual(["renter"]);
  });

  it("clears the session and private cache when a request reports 401", async () => {
    auth.getToken.mockReturnValue("token");
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.user).not.toBeNull());

    queryClient.setQueryData(["bookings"], { secret: true });
    act(() => emitAuthFailure());

    expect(result.current.user).toBeNull();
    expect(result.current.roles).toEqual([]);
    expect(auth.logout).toHaveBeenCalled();
    expect(queryClient.getQueryData(["bookings"])).toBeUndefined();
  });
});
