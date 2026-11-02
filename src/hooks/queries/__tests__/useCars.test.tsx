import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useCars, useCreateCar } from "../useCars";
import { data } from "@/lib/data";
import type { CarWithOwner } from "@/lib/data/types";

vi.mock("@/lib/data", () => ({
  data: {
    cars: {
      list: vi.fn(),
      create: vi.fn(),
    },
  },
}));

const cars = data.cars as unknown as {
  list: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
};

const car = {
  id: "c1",
  owner_id: "o1",
  make: "Tesla",
  model: "Model 3",
  year: 2023,
  category: "Electric",
  daily_rate: 89,
  location_lat: null,
  location_lng: null,
  address: "MTL",
  description: null,
  features: {},
  images: [],
  is_active: true,
  status: "live",
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
  owner: {
    id: "o1",
    full_name: "Owner",
    avatar_url: null,
    kyc_status: "verified",
    rating_avg: 4.5,
    review_count: 2,
  },
} as CarWithOwner;

const makeWrapper = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
};

beforeEach(() => vi.clearAllMocks());

describe("useCars", () => {
  it("returns the car list from the adapter", async () => {
    cars.list.mockResolvedValue([car]);
    const { result } = renderHook(() => useCars({ limit: 6 }), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toHaveLength(1);
    expect(cars.list).toHaveBeenCalledWith({ limit: 6 });
  });

  it("creates a car through the adapter", async () => {
    cars.create.mockResolvedValue(car);
    const { result } = renderHook(() => useCreateCar(), { wrapper: makeWrapper() });

    await result.current.mutateAsync({
      make: "Tesla",
      model: "Model 3",
      year: 2023,
      category: "Electric",
      daily_rate: 89,
      address: "MTL",
    });

    expect(cars.create).toHaveBeenCalledTimes(1);
  });
});
