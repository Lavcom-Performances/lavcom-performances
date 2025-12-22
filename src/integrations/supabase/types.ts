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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      contact_messages: {
        Row: {
          created_at: string
          duplicate_ignored: boolean | null
          email: string
          honeypot_triggered: boolean | null
          id: string
          ip: string | null
          message: string
          message_hash: string | null
          name: string
          status: string
          subject: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          duplicate_ignored?: boolean | null
          email: string
          honeypot_triggered?: boolean | null
          id?: string
          ip?: string | null
          message: string
          message_hash?: string | null
          name: string
          status?: string
          subject?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          duplicate_ignored?: boolean | null
          email?: string
          honeypot_triggered?: boolean | null
          id?: string
          ip?: string | null
          message?: string
          message_hash?: string | null
          name?: string
          status?: string
          subject?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      import_batches: {
        Row: {
          created_at: string
          filename: string
          id: string
          ignored_rows: number
          imported_rows: number
          site_id: string
          total_rows: number
          user_id: string
        }
        Insert: {
          created_at?: string
          filename: string
          id?: string
          ignored_rows?: number
          imported_rows?: number
          site_id: string
          total_rows?: number
          user_id: string
        }
        Update: {
          created_at?: string
          filename?: string
          id?: string
          ignored_rows?: number
          imported_rows?: number
          site_id?: string
          total_rows?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_batches_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      login_logs: {
        Row: {
          browser: string | null
          created_at: string
          device_type: string | null
          id: string
          ip_hash: string | null
          is_new_device: boolean | null
          os: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          browser?: string | null
          created_at?: string
          device_type?: string | null
          id?: string
          ip_hash?: string | null
          is_new_device?: boolean | null
          os?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          browser?: string | null
          created_at?: string
          device_type?: string | null
          id?: string
          ip_hash?: string | null
          is_new_device?: boolean | null
          os?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      operations: {
        Row: {
          amount: number
          created_at: string
          id: string
          import_batch_id: string | null
          machine: string | null
          operation_date: string
          operation_time: string | null
          payment_mode: string | null
          program: string | null
          raw_data: Json | null
          site_id: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          import_batch_id?: string | null
          machine?: string | null
          operation_date: string
          operation_time?: string | null
          payment_mode?: string | null
          program?: string | null
          raw_data?: Json | null
          site_id: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          import_batch_id?: string | null
          machine?: string | null
          operation_date?: string
          operation_time?: string | null
          payment_mode?: string | null
          program?: string | null
          raw_data?: Json | null
          site_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "operations_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operations_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          access_expires_at: string | null
          avatar_url: string | null
          company_name: string | null
          created_at: string | null
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          last_purchase_at: string | null
          log_retention_days: number
          max_projects: number | null
          phone: string | null
          plan_code: string | null
          siret: string | null
          updated_at: string | null
        }
        Insert: {
          access_expires_at?: string | null
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string | null
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          last_purchase_at?: string | null
          log_retention_days?: number
          max_projects?: number | null
          phone?: string | null
          plan_code?: string | null
          siret?: string | null
          updated_at?: string | null
        }
        Update: {
          access_expires_at?: string | null
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          last_purchase_at?: string | null
          log_retention_days?: number
          max_projects?: number | null
          phone?: string | null
          plan_code?: string | null
          siret?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      purchases: {
        Row: {
          access_days: number
          amount_ttc: number
          created_at: string
          currency: string
          id: string
          max_projects: number
          plan_code: string
          stripe_customer_id: string | null
          stripe_session_id: string
          user_id: string
        }
        Insert: {
          access_days: number
          amount_ttc: number
          created_at?: string
          currency?: string
          id?: string
          max_projects: number
          plan_code: string
          stripe_customer_id?: string | null
          stripe_session_id: string
          user_id: string
        }
        Update: {
          access_days?: number
          amount_ttc?: number
          created_at?: string
          currency?: string
          id?: string
          max_projects?: number
          plan_code?: string
          stripe_customer_id?: string | null
          stripe_session_id?: string
          user_id?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          count: number
          created_at: string
          id: string
          identifier: string
          ip_hash: string | null
          scope: string
          updated_at: string
          window_start: string
        }
        Insert: {
          count?: number
          created_at?: string
          id?: string
          identifier: string
          ip_hash?: string | null
          scope: string
          updated_at?: string
          window_start?: string
        }
        Update: {
          count?: number
          created_at?: string
          id?: string
          identifier?: string
          ip_hash?: string | null
          scope?: string
          updated_at?: string
          window_start?: string
        }
        Relationships: []
      }
      site_costs: {
        Row: {
          created_at: string
          fixed_cleaning: number | null
          fixed_insurance: number | null
          fixed_lease: number | null
          fixed_other: number | null
          fixed_rent: number | null
          fixed_subscriptions: number | null
          id: string
          site_id: string
          updated_at: string
          user_id: string
          var_detergent_percent: number | null
          var_energy_water_percent: number | null
        }
        Insert: {
          created_at?: string
          fixed_cleaning?: number | null
          fixed_insurance?: number | null
          fixed_lease?: number | null
          fixed_other?: number | null
          fixed_rent?: number | null
          fixed_subscriptions?: number | null
          id?: string
          site_id: string
          updated_at?: string
          user_id: string
          var_detergent_percent?: number | null
          var_energy_water_percent?: number | null
        }
        Update: {
          created_at?: string
          fixed_cleaning?: number | null
          fixed_insurance?: number | null
          fixed_lease?: number | null
          fixed_other?: number | null
          fixed_rent?: number | null
          fixed_subscriptions?: number | null
          id?: string
          site_id?: string
          updated_at?: string
          user_id?: string
          var_detergent_percent?: number | null
          var_energy_water_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "site_costs_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: true
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      sites: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          id: string
          is_default: boolean | null
          is_demo: boolean
          name: string
          postal_code: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          is_demo?: boolean
          name: string
          postal_code?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          is_demo?: boolean
          name?: string
          postal_code?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string | null
          id: string
          laundry_count: number | null
          plan_type: string
          status: string
          subscription_end_date: string | null
          subscription_start_date: string | null
          trial_end_date: string | null
          trial_reminder_sent: boolean | null
          trial_start_date: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          laundry_count?: number | null
          plan_type?: string
          status?: string
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          trial_end_date?: string | null
          trial_reminder_sent?: boolean | null
          trial_start_date?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          laundry_count?: number | null
          plan_type?: string
          status?: string
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          trial_end_date?: string | null
          trial_reminder_sent?: boolean | null
          trial_start_date?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_goals: {
        Row: {
          annual_revenue_goal: number | null
          created_at: string
          id: string
          monthly_revenue_goal: number | null
          monthly_transactions_goal: number | null
          site_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          annual_revenue_goal?: number | null
          created_at?: string
          id?: string
          monthly_revenue_goal?: number | null
          monthly_transactions_goal?: number | null
          site_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          annual_revenue_goal?: number | null
          created_at?: string
          id?: string
          monthly_revenue_goal?: number | null
          monthly_transactions_goal?: number | null
          site_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_goals_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      owns_operation_site: {
        Args: { _site_id: string; _user_id: string }
        Returns: boolean
      }
      owns_site: { Args: { _site_id: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
