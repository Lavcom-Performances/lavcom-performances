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
      admin_audit_logs: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          details: Json | null
          id: string
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          details?: Json | null
          id?: string
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          details?: Json | null
          id?: string
        }
        Relationships: []
      }
      analytics_daily: {
        Row: {
          average_basket: number | null
          created_at: string | null
          date: string
          hourly_breakdown: Json | null
          id: string
          machine_stats: Json | null
          revenue: number | null
          revenue_card: number | null
          revenue_cash: number | null
          site_id: string
          transactions: number | null
          user_id: string
        }
        Insert: {
          average_basket?: number | null
          created_at?: string | null
          date: string
          hourly_breakdown?: Json | null
          id?: string
          machine_stats?: Json | null
          revenue?: number | null
          revenue_card?: number | null
          revenue_cash?: number | null
          site_id: string
          transactions?: number | null
          user_id: string
        }
        Update: {
          average_basket?: number | null
          created_at?: string | null
          date?: string
          hourly_breakdown?: Json | null
          id?: string
          machine_stats?: Json | null
          revenue?: number | null
          revenue_card?: number | null
          revenue_cash?: number | null
          site_id?: string
          transactions?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_daily_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_kpis: {
        Row: {
          average_basket: number | null
          created_at: string | null
          id: string
          peak_hour: number | null
          period_end: string
          period_start: string
          period_type: string
          revenue_card: number | null
          revenue_cash: number | null
          site_id: string
          total_revenue: number | null
          total_transactions: number | null
          unique_machines: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          average_basket?: number | null
          created_at?: string | null
          id?: string
          peak_hour?: number | null
          period_end: string
          period_start: string
          period_type: string
          revenue_card?: number | null
          revenue_cash?: number | null
          site_id: string
          total_revenue?: number | null
          total_transactions?: number | null
          unique_machines?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          average_basket?: number | null
          created_at?: string | null
          id?: string
          peak_hour?: number | null
          period_end?: string
          period_start?: string
          period_type?: string
          revenue_card?: number | null
          revenue_cash?: number | null
          site_id?: string
          total_revenue?: number | null
          total_transactions?: number | null
          unique_machines?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_kpis_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      churn_alert_settings: {
        Row: {
          alert_cooldown_hours: number
          churn_threshold: number
          created_at: string
          email_enabled: boolean
          id: string
          last_alert_at: string | null
          recipient_emails: string[]
          updated_at: string
        }
        Insert: {
          alert_cooldown_hours?: number
          churn_threshold?: number
          created_at?: string
          email_enabled?: boolean
          id?: string
          last_alert_at?: string | null
          recipient_emails?: string[]
          updated_at?: string
        }
        Update: {
          alert_cooldown_hours?: number
          churn_threshold?: number
          created_at?: string
          email_enabled?: boolean
          id?: string
          last_alert_at?: string | null
          recipient_emails?: string[]
          updated_at?: string
        }
        Relationships: []
      }
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
      cron_alert_settings: {
        Row: {
          alert_cooldown_minutes: number
          created_at: string
          critical_threshold: number
          email_enabled: boolean
          failure_threshold: number
          id: string
          job_name: string
          last_alert_at: string | null
          last_alert_severity: string | null
          slack_enabled: boolean
          updated_at: string
          warning_threshold: number
        }
        Insert: {
          alert_cooldown_minutes?: number
          created_at?: string
          critical_threshold?: number
          email_enabled?: boolean
          failure_threshold?: number
          id?: string
          job_name?: string
          last_alert_at?: string | null
          last_alert_severity?: string | null
          slack_enabled?: boolean
          updated_at?: string
          warning_threshold?: number
        }
        Update: {
          alert_cooldown_minutes?: number
          created_at?: string
          critical_threshold?: number
          email_enabled?: boolean
          failure_threshold?: number
          id?: string
          job_name?: string
          last_alert_at?: string | null
          last_alert_severity?: string | null
          slack_enabled?: boolean
          updated_at?: string
          warning_threshold?: number
        }
        Relationships: []
      }
      cron_logs: {
        Row: {
          completed_at: string | null
          details: Json | null
          duration_ms: number | null
          error_message: string | null
          id: string
          job_name: string
          sites_failed: number | null
          sites_processed: number | null
          started_at: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          details?: Json | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          job_name: string
          sites_failed?: number | null
          sites_processed?: number | null
          started_at?: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          details?: Json | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          job_name?: string
          sites_failed?: number | null
          sites_processed?: number | null
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      expert_requests: {
        Row: {
          created_at: string
          email: string
          expert_type: string
          id: string
          message: string | null
          name: string
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          expert_type: string
          id?: string
          message?: string | null
          name: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          expert_type?: string
          id?: string
          message?: string | null
          name?: string
          phone?: string | null
          status?: string
          updated_at?: string
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
      notification_preferences: {
        Row: {
          created_at: string
          email_alerts: boolean
          id: string
          maintenance_alerts: boolean
          push_alerts: boolean
          revenue_alerts: boolean
          trial_reminder: boolean
          updated_at: string
          user_id: string
          weekly_report: boolean
        }
        Insert: {
          created_at?: string
          email_alerts?: boolean
          id?: string
          maintenance_alerts?: boolean
          push_alerts?: boolean
          revenue_alerts?: boolean
          trial_reminder?: boolean
          updated_at?: string
          user_id: string
          weekly_report?: boolean
        }
        Update: {
          created_at?: string
          email_alerts?: boolean
          id?: string
          maintenance_alerts?: boolean
          push_alerts?: boolean
          revenue_alerts?: boolean
          trial_reminder?: boolean
          updated_at?: string
          user_id?: string
          weekly_report?: boolean
        }
        Relationships: []
      }
      operations: {
        Row: {
          amount: number
          change_eur: number | null
          created_at: string
          dedupe_key: string | null
          id: string
          import_batch_id: string | null
          import_hash: string | null
          inserted_eur: number | null
          machine: string | null
          machine_name: string | null
          operation_date: string
          operation_time: string | null
          payment_mode: string | null
          price_cb: number | null
          price_esp: number | null
          price_eur: number | null
          program: string | null
          raw: Json | null
          raw_data: Json | null
          site_id: string
          source: string
          type: string | null
          user_id: string
        }
        Insert: {
          amount: number
          change_eur?: number | null
          created_at?: string
          dedupe_key?: string | null
          id?: string
          import_batch_id?: string | null
          import_hash?: string | null
          inserted_eur?: number | null
          machine?: string | null
          machine_name?: string | null
          operation_date: string
          operation_time?: string | null
          payment_mode?: string | null
          price_cb?: number | null
          price_esp?: number | null
          price_eur?: number | null
          program?: string | null
          raw?: Json | null
          raw_data?: Json | null
          site_id: string
          source?: string
          type?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          change_eur?: number | null
          created_at?: string
          dedupe_key?: string | null
          id?: string
          import_batch_id?: string | null
          import_hash?: string | null
          inserted_eur?: number | null
          machine?: string | null
          machine_name?: string | null
          operation_date?: string
          operation_time?: string | null
          payment_mode?: string | null
          price_cb?: number | null
          price_esp?: number | null
          price_eur?: number | null
          program?: string | null
          raw?: Json | null
          raw_data?: Json | null
          site_id?: string
          source?: string
          type?: string | null
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
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      permission_audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_hash: string | null
          new_values: Json | null
          old_values: Json | null
          organization_id: string
          performed_by: string
          target_user_id: string
          user_agent: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_hash?: string | null
          new_values?: Json | null
          old_values?: Json | null
          organization_id: string
          performed_by: string
          target_user_id: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_hash?: string | null
          new_values?: Json | null
          old_values?: Json | null
          organization_id?: string
          performed_by?: string
          target_user_id?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      permission_webhooks: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_enabled: boolean
          name: string
          organization_id: string
          type: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_enabled?: boolean
          name: string
          organization_id: string
          type?: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_enabled?: boolean
          name?: string
          organization_id?: string
          type?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "permission_webhooks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          stripe_customer_id: string | null
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
          stripe_customer_id?: string | null
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
          stripe_customer_id?: string | null
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
      site_access: {
        Row: {
          can_delete: boolean
          can_edit: boolean
          can_export: boolean
          can_view: boolean
          created_at: string
          id: string
          site_id: string
          user_id: string
        }
        Insert: {
          can_delete?: boolean
          can_edit?: boolean
          can_export?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          site_id: string
          user_id: string
        }
        Update: {
          can_delete?: boolean
          can_edit?: boolean
          can_export?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          site_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_access_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
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
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
          postal_code?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_events: {
        Row: {
          created_at: string | null
          event_id: string
          event_type: string
          payload: Json | null
          processed_at: string | null
        }
        Insert: {
          created_at?: string | null
          event_id: string
          event_type: string
          payload?: Json | null
          processed_at?: string | null
        }
        Update: {
          created_at?: string | null
          event_id?: string
          event_type?: string
          payload?: Json | null
          processed_at?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string | null
          current_period_end: string | null
          id: string
          last_invoice_url: string | null
          laundry_count: number | null
          plan_type: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
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
          current_period_end?: string | null
          id?: string
          last_invoice_url?: string | null
          laundry_count?: number | null
          plan_type?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
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
          current_period_end?: string | null
          id?: string
          last_invoice_url?: string | null
          laundry_count?: number | null
          plan_type?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
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
      team_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_chart_preferences: {
        Row: {
          created_at: string
          filters: Json
          id: string
          page_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filters?: Json
          id?: string
          page_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          filters?: Json
          id?: string
          page_key?: string
          updated_at?: string
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
      user_permissions: {
        Row: {
          can_delete_data: boolean
          can_delete_sites: boolean
          can_edit_sites: boolean
          can_export_data: boolean
          can_export_reports: boolean
          can_import_data: boolean
          can_invite_members: boolean
          can_manage_billing: boolean
          can_manage_roles: boolean
          can_view_billing: boolean
          can_view_reports: boolean
          can_view_sites: boolean
          created_at: string
          id: string
          organization_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          can_delete_data?: boolean
          can_delete_sites?: boolean
          can_edit_sites?: boolean
          can_export_data?: boolean
          can_export_reports?: boolean
          can_import_data?: boolean
          can_invite_members?: boolean
          can_manage_billing?: boolean
          can_manage_roles?: boolean
          can_view_billing?: boolean
          can_view_reports?: boolean
          can_view_sites?: boolean
          created_at?: string
          id?: string
          organization_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          can_delete_data?: boolean
          can_delete_sites?: boolean
          can_edit_sites?: boolean
          can_export_data?: boolean
          can_export_reports?: boolean
          can_import_data?: boolean
          can_invite_members?: boolean
          can_manage_billing?: boolean
          can_manage_roles?: boolean
          can_view_billing?: boolean
          can_view_reports?: boolean
          can_view_sites?: boolean
          created_at?: string
          id?: string
          organization_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_old_cron_logs: { Args: never; Returns: undefined }
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      get_user_org_id: { Args: { _user_id: string }; Returns: string }
      has_org_role: {
        Args: {
          _org_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_org_admin: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      owns_operation_site: {
        Args: { _site_id: string; _user_id: string }
        Returns: boolean
      }
      owns_site: { Args: { _site_id: string }; Returns: boolean }
      rpc_admin_churn_predictions: { Args: never; Returns: Json }
      rpc_admin_global_stats: { Args: never; Returns: Json }
      rpc_admin_monthly_series: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: Json
      }
      rpc_admin_retention_metrics: { Args: never; Returns: Json }
      rpc_admin_revenue_stats: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: Json
      }
      rpc_admin_subscription_metrics: { Args: never; Returns: Json }
      rpc_admin_top_sites: {
        Args: { p_end_date: string; p_limit?: number; p_start_date: string }
        Returns: Json
      }
      rpc_dashboard_kpis: {
        Args: { p_end_date: string; p_site_id: string; p_start_date: string }
        Returns: {
          average_basket: number
          peak_hour: number
          revenue_cb: number
          revenue_esp: number
          total_revenue: number
          total_transactions: number
          unique_machines: number
        }[]
      }
      rpc_date_bounds: {
        Args: { p_site_id: string }
        Returns: {
          max_date: string
          min_date: string
          total_count: number
        }[]
      }
      rpc_monthly_revenue: {
        Args: { p_site_id: string; p_year: number }
        Returns: {
          month: number
          revenue_cb: number
          revenue_esp: number
          revenue_total: number
          transactions_count: number
        }[]
      }
      rpc_monthly_revenue_range: {
        Args: { p_end_date: string; p_site_id: string; p_start_date: string }
        Returns: {
          month: number
          revenue_cb: number
          revenue_esp: number
          revenue_total: number
          transactions_count: number
          year: number
        }[]
      }
      rpc_operations_calendar_kpis: {
        Args: { p_site_id: string }
        Returns: {
          period: string
          revenue_cb: number
          revenue_esp: number
          revenue_total: number
        }[]
      }
      rpc_recommendations_v1: {
        Args: { p_end_date: string; p_site_id: string; p_start_date: string }
        Returns: {
          description: string
          effort: string
          impact_estimated: number
          meta: Json
          rec_key: string
          severity: string
          title: string
        }[]
      }
      trigger_compute_analytics_cron: { Args: never; Returns: undefined }
      user_belongs_to_org: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "checker" | "user" | "guest"
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
      app_role: ["super_admin", "admin", "checker", "user", "guest"],
    },
  },
} as const
