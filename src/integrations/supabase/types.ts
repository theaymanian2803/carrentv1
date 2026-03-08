export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          car_id: string
          created_at: string
          end_date: string
          id: string
          owner_payout: number
          platform_fee: number
          renter_id: string
          start_date: string
          status: Database["public"]["Enums"]["booking_status"]
          total_days: number
          total_price: number
          updated_at: string
        }
        Insert: {
          car_id: string
          created_at?: string
          end_date: string
          id?: string
          owner_payout?: number
          platform_fee?: number
          renter_id: string
          start_date: string
          status?: Database["public"]["Enums"]["booking_status"]
          total_days: number
          total_price?: number
          updated_at?: string
        }
        Update: {
          car_id?: string
          created_at?: string
          end_date?: string
          id?: string
          owner_payout?: number
          platform_fee?: number
          renter_id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["booking_status"]
          total_days?: number
          total_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
        ]
      }
      cars: {
        Row: {
          address: string
          category: Database["public"]["Enums"]["car_category"]
          created_at: string
          daily_rate: number
          description: string | null
          features: Json
          id: string
          images: string[]
          is_active: boolean
          location_lat: number | null
          location_lng: number | null
          make: string
          model: string
          owner_id: string
          status: Database["public"]["Enums"]["car_status"]
          updated_at: string
          year: number
        }
        Insert: {
          address?: string
          category: Database["public"]["Enums"]["car_category"]
          created_at?: string
          daily_rate: number
          description?: string | null
          features?: Json
          id?: string
          images?: string[]
          is_active?: boolean
          location_lat?: number | null
          location_lng?: number | null
          make: string
          model: string
          owner_id: string
          status?: Database["public"]["Enums"]["car_status"]
          updated_at?: string
          year: number
        }
        Update: {
          address?: string
          category?: Database["public"]["Enums"]["car_category"]
          created_at?: string
          daily_rate?: number
          description?: string | null
          features?: Json
          id?: string
          images?: string[]
          is_active?: boolean
          location_lat?: number | null
          location_lng?: number | null
          make?: string
          model?: string
          owner_id?: string
          status?: Database["public"]["Enums"]["car_status"]
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      messages: {
        Row: {
          booking_id: string | null
          content: string
          created_at: string
          id: string
          read_status: boolean
          receiver_id: string
          sender_id: string
        }
        Insert: {
          booking_id?: string | null
          content: string
          created_at?: string
          id?: string
          read_status?: boolean
          receiver_id: string
          sender_id: string
        }
        Update: {
          booking_id?: string | null
          content?: string
          created_at?: string
          id?: string
          read_status?: boolean
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          kyc_status: Database["public"]["Enums"]["kyc_status"]
          stripe_account_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          stripe_account_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          stripe_account_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          booking_id: string
          comment: string | null
          created_at: string
          id: string
          rating: number
          reviewee_id: string
          reviewer_id: string
        }
        Insert: {
          booking_id: string
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          reviewee_id: string
          reviewer_id: string
        }
        Update: {
          booking_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          reviewee_id?: string
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "owner" | "renter"
      booking_status:
        | "pending"
        | "approved"
        | "active"
        | "completed"
        | "cancelled"
        | "disputed"
      car_category: "SUV" | "Sedan" | "Luxury" | "Electric"
      car_status: "pending_approval" | "live" | "delisted"
      kyc_status: "pending" | "verified" | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "owner", "renter"],
      booking_status: [
        "pending",
        "approved",
        "active",
        "completed",
        "cancelled",
        "disputed",
      ],
      car_category: ["SUV", "Sedan", "Luxury", "Electric"],
      car_status: ["pending_approval", "live", "delisted"],
      kyc_status: ["pending", "verified", "rejected"],
    },
  },
} as const
