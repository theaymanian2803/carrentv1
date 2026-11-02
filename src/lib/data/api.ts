import { apiFetch, getToken, setToken } from "@/lib/api";
import type {
  AdminStats,
  AdminSubscription,
  AdminUser,
  AppRole,
  Booking,
  BookingInput,
  BookingStatus,
  Car,
  CarFilters,
  CarInput,
  CarStatus,
  CarWithOwner,
  DataClient,
  KycStatus,
  LandingSection,
  LandingSectionInput,
  OwnerBooking,
  Profile,
  RenterBooking,
  Review,
  Session,
  SubscriptionInfo,
} from "./types";

const query = (params: Record<string, string | number | undefined>): string => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
};

export const apiAdapter: DataClient = {
  auth: {
    register: (input) =>
      apiFetch<Session>("/auth/register", {
        method: "POST",
        body: {
          email: input.email,
          password: input.password,
          fullName: input.fullName,
          role: input.role,
        },
      }).then((session) => {
        setToken(session.token);
        return session;
      }),
    login: (input) =>
      apiFetch<Session>("/auth/login", { method: "POST", body: input }).then((session) => {
        setToken(session.token);
        return session;
      }),
    guest: () =>
      apiFetch<Session>("/auth/guest", { method: "POST" }).then((session) => {
        setToken(session.token);
        return session;
      }),
    me: () => apiFetch("/auth/me"),
    logout: async () => {
      try {
        await apiFetch("/auth/logout", { method: "POST" });
      } finally {
        setToken(null);
      }
    },
    getToken,
  },

  profile: {
    update: (input) => apiFetch<Profile>("/me/profile", { method: "PUT", body: input }),
  },

  cars: {
    list: (filters: CarFilters = {}) =>
      apiFetch<CarWithOwner[]>(
        `/cars${query({
          category: filters.category,
          minPrice: filters.minPrice,
          maxPrice: filters.maxPrice,
          q: filters.q,
          limit: filters.limit,
        })}`
      ),
    get: (id) => apiFetch<CarWithOwner>(`/cars/${id}`),
    mine: () => apiFetch<Car[]>("/me/cars"),
    create: (input) => apiFetch<CarWithOwner>("/me/cars", { method: "POST", body: input }),
    update: (id, input) =>
      apiFetch<CarWithOwner>(`/me/cars/${id}`, { method: "PUT", body: input }),
    remove: (id) => apiFetch<void>(`/me/cars/${id}`, { method: "DELETE" }),
  },

  bookings: {
    mine: () =>
      apiFetch<{ asRenter: RenterBooking[]; asOwner: OwnerBooking[] }>("/me/bookings"),
    create: (input: BookingInput) =>
      apiFetch<Booking & { id: string }>("/me/bookings", { method: "POST", body: input }),
    setStatus: (id, status: BookingStatus) =>
      apiFetch<Booking>(`/me/bookings/${id}/status`, {
        method: "PATCH",
        body: { status },
      }),
  },

  reviews: {
    forUser: (id) => apiFetch<Review[]>(`/reviews${query({ reviewee_id: id })}`),
    mine: () => apiFetch<Review[]>("/me/reviews"),
    create: (input) => apiFetch<Review>("/me/reviews", { method: "POST", body: input }),
  },

  subscriptions: {
    info: () => apiFetch<SubscriptionInfo>("/me/subscription"),
    createCheckout: (returnUrl, cancelUrl) =>
      apiFetch<{ subscription_id: string; approval_url: string | null }>(
        "/payments/paypal/create-subscription",
        { method: "POST", body: { return_url: returnUrl, cancel_url: cancelUrl } }
      ).then((data) => {
        if (!data.approval_url) throw new Error("PayPal did not return an approval URL");
        return { approvalUrl: data.approval_url };
      }),
    activate: (subscriptionId) =>
      apiFetch<void>("/payments/paypal/activate", {
        method: "POST",
        body: { subscription_id: subscriptionId },
      }),
  },

  landing: {
    list: () => apiFetch<LandingSection[]>("/admin/landing-sections"),
    publicList: () => apiFetch<LandingSection[]>("/landing-sections"),
    create: (input: LandingSectionInput) =>
      apiFetch<LandingSection>("/admin/landing-sections", { method: "POST", body: input }),
    update: (id, input) =>
      apiFetch<LandingSection>(`/admin/landing-sections/${id}`, { method: "PUT", body: input }),
    remove: (id) => apiFetch<void>(`/admin/landing-sections/${id}`, { method: "DELETE" }),
  },

  admin: {
    stats: () => apiFetch<AdminStats>("/admin/stats"),
    users: () => apiFetch<AdminUser[]>("/admin/users"),
    setRoles: async (id, roles: AppRole[]) => {
      await apiFetch(`/admin/users/${id}/roles`, { method: "PUT", body: { roles } });
    },
    setKyc: async (id, status: KycStatus) => {
      await apiFetch(`/admin/users/${id}/kyc`, { method: "PATCH", body: { status } });
    },
    cars: () => apiFetch<CarWithOwner[]>("/admin/cars"),
    createCar: (input) => apiFetch<CarWithOwner>("/admin/cars", { method: "POST", body: input }),
    setCarStatus: async (id, status: CarStatus) => {
      await apiFetch(`/admin/cars/${id}/status`, { method: "PATCH", body: { status } });
    },
    removeCar: (id) => apiFetch<void>(`/admin/cars/${id}`, { method: "DELETE" }),
    bookings: () => apiFetch<OwnerBooking[]>("/admin/bookings"),
    setBookingStatus: async (id, status: BookingStatus) => {
      await apiFetch(`/admin/bookings/${id}/status`, { method: "PATCH", body: { status } });
    },
    removeBooking: (id) => apiFetch<void>(`/admin/bookings/${id}`, { method: "DELETE" }),
    subscriptions: () => apiFetch<AdminSubscription[]>("/admin/subscriptions"),
    setSubscription: async (id, input) => {
      await apiFetch(`/admin/subscriptions/${id}`, { method: "PATCH", body: input });
    },
  },

  media: {
    upload: (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return apiFetch<{ url: string }>("/me/upload", { method: "POST", formData: form });
    },
  },
};
