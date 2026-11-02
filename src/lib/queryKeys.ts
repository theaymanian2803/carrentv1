export const queryKeys = {
  cars: (filters: unknown = {}) => ["cars", filters] as const,
  car: (id: string) => ["car", id] as const,
  myCars: ["my-cars"] as const,
  bookings: ["bookings"] as const,
  reviews: (revieweeId: string) => ["reviews", revieweeId] as const,
  myReviews: ["my-reviews"] as const,
  profile: ["profile"] as const,
  subscription: ["subscription"] as const,
  landing: ["landing"] as const,
  admin: {
    users: ["admin", "users"] as const,
    stats: ["admin", "stats"] as const,
    cars: ["admin", "cars"] as const,
    bookings: ["admin", "bookings"] as const,
    subscriptions: ["admin", "subscriptions"] as const,
  },
};
