import type {
  AppRole,
  Booking,
  BookingStatus,
  Car,
  CarCategory,
  CarStatus,
  KycStatus,
  Profile,
  Review,
} from "@/types/database";

export type {
  AppRole,
  Booking,
  BookingStatus,
  Car,
  CarCategory,
  CarStatus,
  KycStatus,
  Profile,
  Review,
};

export interface AuthUser {
  id: string;
  email: string;
  fullName: string | null;
  isGuest: boolean;
}

export interface Session {
  token: string;
  user: AuthUser;
}

export interface OwnerSummary {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  kyc_status: string | null;
  rating_avg: number;
  review_count: number;
}

export interface CarWithOwner extends Car {
  owner: OwnerSummary;
}

export interface CarInput {
  make: string;
  model: string;
  year: number;
  category: CarCategory;
  daily_rate: number;
  address: string;
  description?: string | null;
  features?: Record<string, unknown>;
  images?: string[];
  location_lat?: number | null;
  location_lng?: number | null;
  is_active?: boolean;
}

export interface CarFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  q?: string;
  limit?: number;
}

export interface CarSummary {
  id: string;
  make: string;
  model: string;
  year: number;
  images: string[];
  address: string;
  daily_rate: number;
}

export interface BookingInput {
  car_id: string;
  start_date: string;
  end_date: string;
  renter_phone?: string;
  renter_email?: string;
  renter_notes?: string;
}

export interface BookingRenter {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface OwnerBooking extends Booking {
  car: CarSummary;
  renter: BookingRenter;
}

export interface RenterBooking extends OwnerBooking {
  renter: BookingRenter & { email: string | null; phone: string | null };
}

export interface SubscriptionInfo {
  plan: "free" | "pro";
  status: string;
  listingCount: number;
  listingLimit: number;
}

export interface LandingSection {
  id: string;
  section_type: string;
  title: string;
  content: Record<string, unknown>;
  sort_order: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface LandingSectionInput {
  section_type: string;
  title?: string;
  content?: Record<string, unknown>;
  sort_order?: number;
  is_visible?: boolean;
}

export interface AdminStats {
  userSignups: Array<{ date: string; count: number }>;
  bookingsTrend: Array<{ date: string; count: number }>;
  userRoles: Array<{ role: string; count: number; color: string }>;
  engagementMetrics: {
    totalUsers: number;
    activeUsers: number;
    totalBookings: number;
    avgBookingsPerUser: number;
  };
}

export interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  kyc_status: string;
  stripe_account_id: string | null;
  is_guest: boolean;
  plan: string;
  status: string;
  created_at: string;
  roles: AppRole[];
}

export interface AdminSubscription {
  id: string;
  user_id: string;
  plan: "free" | "pro";
  status: string;
  current_period_end: string | null;
  paypal_subscription_id: string | null;
  full_name: string | null;
  email: string | null;
}

export interface DataClient {
  auth: {
    register(input: {
      email: string;
      password: string;
      fullName: string;
      role: "owner" | "renter";
    }): Promise<Session>;
    login(input: { email: string; password: string }): Promise<Session>;
    guest(): Promise<Session>;
    me(): Promise<{ user: AuthUser; profile: Profile | null; roles: AppRole[] }>;
    logout(): Promise<void>;
    getToken(): string | null;
  };
  profile: {
    update(input: { full_name?: string; avatar_url?: string }): Promise<Profile>;
  };
  cars: {
    list(filters?: CarFilters): Promise<CarWithOwner[]>;
    get(id: string): Promise<CarWithOwner>;
    mine(): Promise<Car[]>;
    create(input: CarInput): Promise<CarWithOwner>;
    update(id: string, input: Partial<CarInput>): Promise<CarWithOwner>;
    remove(id: string): Promise<void>;
  };
  bookings: {
    mine(): Promise<{ asRenter: RenterBooking[]; asOwner: OwnerBooking[] }>;
    create(input: BookingInput): Promise<Booking & { id: string }>;
    setStatus(id: string, status: BookingStatus): Promise<Booking>;
  };
  reviews: {
    forUser(id: string): Promise<Review[]>;
    mine(): Promise<Review[]>;
    create(input: { booking_id: string; rating: number; comment?: string }): Promise<Review>;
  };
  subscriptions: {
    info(): Promise<SubscriptionInfo>;
    createCheckout(returnUrl: string, cancelUrl: string): Promise<{ approvalUrl: string }>;
    activate(subscriptionId: string): Promise<void>;
  };
  landing: {
    list(): Promise<LandingSection[]>;
    publicList(): Promise<LandingSection[]>;
    create(input: LandingSectionInput): Promise<LandingSection>;
    update(id: string, input: Partial<LandingSectionInput>): Promise<LandingSection>;
    remove(id: string): Promise<void>;
  };
  admin: {
    stats(): Promise<AdminStats>;
    users(): Promise<AdminUser[]>;
    setRoles(id: string, roles: AppRole[]): Promise<void>;
    setKyc(id: string, status: KycStatus): Promise<void>;
    cars(): Promise<CarWithOwner[]>;
    createCar(input: CarInput & { owner_id?: string; status?: CarStatus }): Promise<CarWithOwner>;
    setCarStatus(id: string, status: CarStatus): Promise<void>;
    removeCar(id: string): Promise<void>;
    bookings(): Promise<OwnerBooking[]>;
    setBookingStatus(id: string, status: BookingStatus): Promise<void>;
    removeBooking(id: string): Promise<void>;
    subscriptions(): Promise<AdminSubscription[]>;
    setSubscription(id: string, input: { plan: "free" | "pro"; status: string }): Promise<void>;
  };
  media: {
    upload(file: File): Promise<{ url: string }>;
  };
}
