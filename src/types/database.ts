export type AppRole = 'admin' | 'owner' | 'renter';
export type KycStatus = 'pending' | 'verified' | 'rejected';
export type CarCategory = 'SUV' | 'Sedan' | 'Luxury' | 'Electric';
export type CarStatus = 'pending_approval' | 'live' | 'delisted';
export type BookingStatus = 'pending' | 'approved' | 'active' | 'completed' | 'cancelled' | 'disputed';

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  kyc_status: KycStatus;
  stripe_account_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

export interface Car {
  id: string;
  owner_id: string;
  make: string;
  model: string;
  year: number;
  category: CarCategory;
  daily_rate: number;
  location_lat: number | null;
  location_lng: number | null;
  address: string;
  description: string | null;
  features: Record<string, unknown>;
  images: string[];
  is_active: boolean;
  status: CarStatus;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  car_id: string;
  renter_id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  platform_fee: number;
  owner_payout: number;
  total_price: number;
  status: BookingStatus;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  booking_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  booking_id: string | null;
  content: string;
  read_status: boolean;
  created_at: string;
}
