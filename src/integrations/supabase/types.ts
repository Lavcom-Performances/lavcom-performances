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
      admin_blocked_users: {
        Row: {
          blocked_at: string
          blocked_by: string | null
          blocked_until: string | null
          created_at: string
          id: string
          reason: string
          suspicious_count: number
          unblocked_at: string | null
          unblocked_by: string | null
          user_id: string
        }
        Insert: {
          blocked_at?: string
          blocked_by?: string | null
          blocked_until?: string | null
          created_at?: string
          id?: string
          reason?: string
          suspicious_count?: number
          unblocked_at?: string | null
          unblocked_by?: string | null
          user_id: string
        }
        Update: {
          blocked_at?: string
          blocked_by?: string | null
          blocked_until?: string | null
          created_at?: string
          id?: string
          reason?: string
          suspicious_count?: number
          unblocked_at?: string | null
          unblocked_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      admin_login_history: {
        Row: {
          browser: string | null
          city: string | null
          country: string | null
          created_at: string
          device_type: string | null
          id: string
          ip_address: string | null
          is_suspicious: boolean | null
          os: string | null
          region: string | null
          session_id: string | null
          suspicious_reason: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          id?: string
          ip_address?: string | null
          is_suspicious?: boolean | null
          os?: string | null
          region?: string | null
          session_id?: string | null
          suspicious_reason?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          id?: string
          ip_address?: string | null
          is_suspicious?: boolean | null
          os?: string | null
          region?: string | null
          session_id?: string | null
          suspicious_reason?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      admin_trusted_ips: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          ip_address: string
          is_active: boolean
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          ip_address: string
          is_active?: boolean
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          ip_address?: string
          is_active?: boolean
        }
        Relationships: []
      }
      ai_usage_daily: {
        Row: {
          actor_id: string
          created_at: string
          date: string
          estimated_cost_eur: number
          request_count: number
          tokens_in: number
          tokens_out: number
          updated_at: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          date?: string
          estimated_cost_eur?: number
          request_count?: number
          tokens_in?: number
          tokens_out?: number
          updated_at?: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          date?: string
          estimated_cost_eur?: number
          request_count?: number
          tokens_in?: number
          tokens_out?: number
          updated_at?: string
        }
        Relationships: []
      }
      alert_history: {
        Row: {
          alert_type: string
          channel: string
          created_at: string
          details: Json | null
          id: string
          message: string
          recipient: string | null
          sent_at: string
          severity: string
          title: string
        }
        Insert: {
          alert_type: string
          channel: string
          created_at?: string
          details?: Json | null
          id?: string
          message: string
          recipient?: string | null
          sent_at?: string
          severity: string
          title: string
        }
        Update: {
          alert_type?: string
          channel?: string
          created_at?: string
          details?: Json | null
          id?: string
          message?: string
          recipient?: string | null
          sent_at?: string
          severity?: string
          title?: string
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
      audit_log_archives: {
        Row: {
          created_at: string
          date_range_end: string
          date_range_start: string
          file_path: string
          file_size_bytes: number | null
          id: string
          records_count: number
          sha256_checksum: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          date_range_end: string
          date_range_start: string
          file_path: string
          file_size_bytes?: number | null
          id?: string
          records_count?: number
          sha256_checksum?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          date_range_end?: string
          date_range_start?: string
          file_path?: string
          file_size_bytes?: number | null
          id?: string
          records_count?: number
          sha256_checksum?: string | null
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          ip_hash: string | null
          metadata: Json | null
          target_id: string | null
          target_table: string
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          ip_hash?: string | null
          metadata?: Json | null
          target_id?: string | null
          target_table: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          ip_hash?: string | null
          metadata?: Json | null
          target_id?: string | null
          target_table?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      auth_login_events: {
        Row: {
          country: string | null
          created_at: string
          device_id: string
          id: string
          ip_hash: string | null
          locale: string | null
          risk_level: string | null
          risk_reasons: string[] | null
          timezone: string | null
          user_agent_hash: string | null
          user_id: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          device_id: string
          id?: string
          ip_hash?: string | null
          locale?: string | null
          risk_level?: string | null
          risk_reasons?: string[] | null
          timezone?: string | null
          user_agent_hash?: string | null
          user_id: string
        }
        Update: {
          country?: string | null
          created_at?: string
          device_id?: string
          id?: string
          ip_hash?: string | null
          locale?: string | null
          risk_level?: string | null
          risk_reasons?: string[] | null
          timezone?: string | null
          user_agent_hash?: string | null
          user_id?: string
        }
        Relationships: []
      }
      auth_login_otps: {
        Row: {
          attempts: number | null
          code_hash: string
          created_at: string
          device_id: string
          expires_at: string
          id: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          attempts?: number | null
          code_hash: string
          created_at?: string
          device_id: string
          expires_at: string
          id?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          attempts?: number | null
          code_hash?: string
          created_at?: string
          device_id?: string
          expires_at?: string
          id?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      backup_files: {
        Row: {
          backup_job_id: string
          created_at: string | null
          file_path: string
          file_size: number
          file_type: string
          id: string
        }
        Insert: {
          backup_job_id: string
          created_at?: string | null
          file_path: string
          file_size: number
          file_type: string
          id?: string
        }
        Update: {
          backup_job_id?: string
          created_at?: string | null
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "backup_files_backup_job_id_fkey"
            columns: ["backup_job_id"]
            isOneToOne: false
            referencedRelation: "backup_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      backup_jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          started_at: string
          status: string
          total_size: number | null
          trigger_type: string
          triggered_by: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          started_at?: string
          status: string
          total_size?: number | null
          trigger_type: string
          triggered_by: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          started_at?: string
          status?: string
          total_size?: number | null
          trigger_type?: string
          triggered_by?: string
        }
        Relationships: []
      }
      beta_company_overrides: {
        Row: {
          company_id: string
          created_at: string
          recommendations_suppressed: boolean
          suppressed_at: string | null
          suppressed_by: string | null
          suppressed_reason: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          recommendations_suppressed?: boolean
          suppressed_at?: string | null
          suppressed_by?: string | null
          suppressed_reason?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          recommendations_suppressed?: boolean
          suppressed_at?: string | null
          suppressed_by?: string | null
          suppressed_reason?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "beta_company_overrides_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      beta_feedback: {
        Row: {
          company_id: string
          created_at: string
          id: string
          message: string | null
          page_context: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sentiment: string
          topic: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          message?: string | null
          page_context?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sentiment: string
          topic: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          message?: string | null
          page_context?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sentiment?: string
          topic?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "beta_feedback_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      company_payment_config: {
        Row: {
          accepted_denominations: number[] | null
          allowed_bills: number[] | null
          cash_step: number | null
          company_id: string
          created_at: string
          has_card: boolean
          id: string
          payment_stack: string | null
          updated_at: string
        }
        Insert: {
          accepted_denominations?: number[] | null
          allowed_bills?: number[] | null
          cash_step?: number | null
          company_id: string
          created_at?: string
          has_card?: boolean
          id?: string
          payment_stack?: string | null
          updated_at?: string
        }
        Update: {
          accepted_denominations?: number[] | null
          allowed_bills?: number[] | null
          cash_step?: number | null
          company_id?: string
          created_at?: string
          has_card?: boolean
          id?: string
          payment_stack?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_payment_config_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_reports: {
        Row: {
          created_at: string
          date_range_end: string
          date_range_start: string
          errors: number
          file_missing: number
          file_path: string | null
          generated_at: string
          generated_by: string | null
          id: string
          integrity_score: number
          no_checksum: number
          period_label: string
          report_data: Json | null
          report_type: string
          retention_years: number | null
          sha256_checksum: string | null
          total_archives: number
          total_storage_bytes: number | null
          verified_invalid: number
          verified_valid: number
        }
        Insert: {
          created_at?: string
          date_range_end: string
          date_range_start: string
          errors?: number
          file_missing?: number
          file_path?: string | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          integrity_score?: number
          no_checksum?: number
          period_label: string
          report_data?: Json | null
          report_type?: string
          retention_years?: number | null
          sha256_checksum?: string | null
          total_archives?: number
          total_storage_bytes?: number | null
          verified_invalid?: number
          verified_valid?: number
        }
        Update: {
          created_at?: string
          date_range_end?: string
          date_range_start?: string
          errors?: number
          file_missing?: number
          file_path?: string | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          integrity_score?: number
          no_checksum?: number
          period_label?: string
          report_data?: Json | null
          report_type?: string
          retention_years?: number | null
          sha256_checksum?: string | null
          total_archives?: number
          total_storage_bytes?: number | null
          verified_invalid?: number
          verified_valid?: number
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
          webhook_alert_threshold_hours: number
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
          webhook_alert_threshold_hours?: number
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
          webhook_alert_threshold_hours?: number
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
      diagnostics_bundles: {
        Row: {
          actor_email: string | null
          actor_id: string
          bundle_summary: Json | null
          created_at: string
          date_from: string | null
          date_to: string | null
          expires_at: string
          file_path: string
          file_size_bytes: number | null
          id: string
          site_id: string | null
        }
        Insert: {
          actor_email?: string | null
          actor_id: string
          bundle_summary?: Json | null
          created_at?: string
          date_from?: string | null
          date_to?: string | null
          expires_at?: string
          file_path: string
          file_size_bytes?: number | null
          id?: string
          site_id?: string | null
        }
        Update: {
          actor_email?: string | null
          actor_id?: string
          bundle_summary?: Json | null
          created_at?: string
          date_from?: string | null
          date_to?: string | null
          expires_at?: string
          file_path?: string
          file_size_bytes?: number | null
          id?: string
          site_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "diagnostics_bundles_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      dr_drill_history: {
        Row: {
          actor_email: string | null
          actor_id: string
          created_at: string
          drill_date: string
          duration_minutes: number
          environment: string
          evidence_folder: string | null
          failures: string[] | null
          id: string
          incident_site_id: string | null
          incident_type: string | null
          notes: string | null
          overall_passed: boolean
          rto_met: boolean
          rto_target_minutes: number
          screenshots: Json | null
          snapshots: Json | null
          step_details: Json
          steps: Json
        }
        Insert: {
          actor_email?: string | null
          actor_id: string
          created_at?: string
          drill_date: string
          duration_minutes: number
          environment?: string
          evidence_folder?: string | null
          failures?: string[] | null
          id?: string
          incident_site_id?: string | null
          incident_type?: string | null
          notes?: string | null
          overall_passed: boolean
          rto_met: boolean
          rto_target_minutes?: number
          screenshots?: Json | null
          snapshots?: Json | null
          step_details?: Json
          steps?: Json
        }
        Update: {
          actor_email?: string | null
          actor_id?: string
          created_at?: string
          drill_date?: string
          duration_minutes?: number
          environment?: string
          evidence_folder?: string | null
          failures?: string[] | null
          id?: string
          incident_site_id?: string | null
          incident_type?: string | null
          notes?: string | null
          overall_passed?: boolean
          rto_met?: boolean
          rto_target_minutes?: number
          screenshots?: Json | null
          snapshots?: Json | null
          step_details?: Json
          steps?: Json
        }
        Relationships: []
      }
      dr_drill_runs: {
        Row: {
          actor_email: string | null
          actor_id: string
          artifacts_paths: Json | null
          blocked_reason: string | null
          created_at: string
          duration_ms: number | null
          ended_at: string | null
          environment: string
          id: string
          overall_passed: boolean | null
          rto_met: boolean | null
          site_id: string | null
          site_name: string | null
          started_at: string
          status: string
          steps_summary: Json | null
        }
        Insert: {
          actor_email?: string | null
          actor_id: string
          artifacts_paths?: Json | null
          blocked_reason?: string | null
          created_at?: string
          duration_ms?: number | null
          ended_at?: string | null
          environment?: string
          id?: string
          overall_passed?: boolean | null
          rto_met?: boolean | null
          site_id?: string | null
          site_name?: string | null
          started_at?: string
          status?: string
          steps_summary?: Json | null
        }
        Update: {
          actor_email?: string | null
          actor_id?: string
          artifacts_paths?: Json | null
          blocked_reason?: string | null
          created_at?: string
          duration_ms?: number | null
          ended_at?: string | null
          environment?: string
          id?: string
          overall_passed?: boolean | null
          rto_met?: boolean | null
          site_id?: string | null
          site_name?: string | null
          started_at?: string
          status?: string
          steps_summary?: Json | null
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
      export_jobs: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string
          error_message: string | null
          expires_at: string | null
          export_type: string
          filters: Json
          finished_at: string | null
          id: string
          progress: number
          result_filename: string | null
          result_mime: string
          result_path: string | null
          role_scope: string
          site_id: string | null
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by: string
          error_message?: string | null
          expires_at?: string | null
          export_type: string
          filters?: Json
          finished_at?: string | null
          id?: string
          progress?: number
          result_filename?: string | null
          result_mime?: string
          result_path?: string | null
          role_scope: string
          site_id?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string
          error_message?: string | null
          expires_at?: string | null
          export_type?: string
          filters?: Json
          finished_at?: string | null
          id?: string
          progress?: number
          result_filename?: string | null
          result_mime?: string
          result_path?: string | null
          role_scope?: string
          site_id?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "export_jobs_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      file_metadata: {
        Row: {
          created_at: string
          description: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          is_public: boolean | null
          mime_type: string | null
          share_expires_at: string | null
          shared_with: string[] | null
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          is_public?: boolean | null
          mime_type?: string | null
          share_expires_at?: string | null
          shared_with?: string[] | null
          tags?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          is_public?: boolean | null
          mime_type?: string | null
          share_expires_at?: string | null
          shared_with?: string[] | null
          tags?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fin_exports: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          file_name: string | null
          file_path: string | null
          format: Database["public"]["Enums"]["fin_export_format"]
          id: string
          metadata: Json | null
          project_id: string
          status: Database["public"]["Enums"]["fin_export_status"]
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          file_name?: string | null
          file_path?: string | null
          format: Database["public"]["Enums"]["fin_export_format"]
          id?: string
          metadata?: Json | null
          project_id: string
          status?: Database["public"]["Enums"]["fin_export_status"]
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          file_name?: string | null
          file_path?: string | null
          format?: Database["public"]["Enums"]["fin_export_format"]
          id?: string
          metadata?: Json | null
          project_id?: string
          status?: Database["public"]["Enums"]["fin_export_status"]
        }
        Relationships: [
          {
            foreignKeyName: "fin_exports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "fin_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_forecasts: {
        Row: {
          cashflow: number
          costs: number
          created_at: string
          cumulative_cashflow: number
          depreciation: number
          ebitda: number
          hypothesis_version: number
          id: string
          month: number
          net_income: number
          project_id: string
          revenue: number
          scenario_id: string | null
          year: number
        }
        Insert: {
          cashflow?: number
          costs?: number
          created_at?: string
          cumulative_cashflow?: number
          depreciation?: number
          ebitda?: number
          hypothesis_version?: number
          id?: string
          month: number
          net_income?: number
          project_id: string
          revenue?: number
          scenario_id?: string | null
          year: number
        }
        Update: {
          cashflow?: number
          costs?: number
          created_at?: string
          cumulative_cashflow?: number
          depreciation?: number
          ebitda?: number
          hypothesis_version?: number
          id?: string
          month?: number
          net_income?: number
          project_id?: string
          revenue?: number
          scenario_id?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "fin_forecasts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "fin_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_forecasts_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "fin_scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_hypotheses: {
        Row: {
          category: Database["public"]["Enums"]["fin_hypothesis_category"]
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          key: string
          label: string | null
          meta: Json | null
          project_id: string
          unit: string | null
          updated_at: string
          value: number
          version: number
        }
        Insert: {
          category: Database["public"]["Enums"]["fin_hypothesis_category"]
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          key: string
          label?: string | null
          meta?: Json | null
          project_id: string
          unit?: string | null
          updated_at?: string
          value: number
          version?: number
        }
        Update: {
          category?: Database["public"]["Enums"]["fin_hypothesis_category"]
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          key?: string
          label?: string | null
          meta?: Json | null
          project_id?: string
          unit?: string | null
          updated_at?: string
          value?: number
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "fin_hypotheses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "fin_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_hypothesis_snapshots: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          project_id: string
          snapshot: Json
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          project_id: string
          snapshot: Json
          version: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          project_id?: string
          snapshot?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "fin_hypothesis_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "fin_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_line_items: {
        Row: {
          capacity_kg: number | null
          category: Database["public"]["Enums"]["fin_line_item_category"]
          code: string | null
          created_at: string
          cycles_per_day_per_unit: number
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_active: boolean
          item_type: string
          label: string
          open_days_per_month: number
          price_ttc_cents: number
          project_id: string
          quantity: number
          scenario_id: string | null
          sort_order: number
          updated_at: string
          utilization_rate: number
        }
        Insert: {
          capacity_kg?: number | null
          category?: Database["public"]["Enums"]["fin_line_item_category"]
          code?: string | null
          created_at?: string
          cycles_per_day_per_unit?: number
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_active?: boolean
          item_type: string
          label: string
          open_days_per_month?: number
          price_ttc_cents?: number
          project_id: string
          quantity?: number
          scenario_id?: string | null
          sort_order?: number
          updated_at?: string
          utilization_rate?: number
        }
        Update: {
          capacity_kg?: number | null
          category?: Database["public"]["Enums"]["fin_line_item_category"]
          code?: string | null
          created_at?: string
          cycles_per_day_per_unit?: number
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_active?: boolean
          item_type?: string
          label?: string
          open_days_per_month?: number
          price_ttc_cents?: number
          project_id?: string
          quantity?: number
          scenario_id?: string | null
          sort_order?: number
          updated_at?: string
          utilization_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "fin_line_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "fin_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_line_items_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "fin_scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_projects: {
        Row: {
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          id: string
          name: string
          project_mode: string
          project_type: string
          questionnaire_completed: boolean
          questionnaire_data: Json | null
          status: Database["public"]["Enums"]["fin_project_status"]
          updated_at: string
          vat_frequency: string
          vat_rate: number
          workspace_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string
          name: string
          project_mode?: string
          project_type?: string
          questionnaire_completed?: boolean
          questionnaire_data?: Json | null
          status?: Database["public"]["Enums"]["fin_project_status"]
          updated_at?: string
          vat_frequency?: string
          vat_rate?: number
          workspace_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string
          name?: string
          project_mode?: string
          project_type?: string
          questionnaire_completed?: boolean
          questionnaire_data?: Json | null
          status?: Database["public"]["Enums"]["fin_project_status"]
          updated_at?: string
          vat_frequency?: string
          vat_rate?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_projects_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "fin_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_scenarios: {
        Row: {
          created_at: string
          hypotheses_override: Json | null
          id: string
          is_baseline: boolean
          name: string
          project_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          hypotheses_override?: Json | null
          id?: string
          is_baseline?: boolean
          name: string
          project_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          hypotheses_override?: Json | null
          id?: string
          is_baseline?: boolean
          name?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_scenarios_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "fin_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_workspaces: {
        Row: {
          access_ends_at: string | null
          created_at: string
          id: string
          max_projects: number
          max_scenarios_per_project: number
          owner_user_id: string
          plan_code: string | null
          updated_at: string
        }
        Insert: {
          access_ends_at?: string | null
          created_at?: string
          id?: string
          max_projects?: number
          max_scenarios_per_project?: number
          owner_user_id: string
          plan_code?: string | null
          updated_at?: string
        }
        Update: {
          access_ends_at?: string | null
          created_at?: string
          id?: string
          max_projects?: number
          max_scenarios_per_project?: number
          owner_user_id?: string
          plan_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      fr_geo_regions: {
        Row: {
          department_code: string
          department_name: string
          region_code: string
          region_name: string
        }
        Insert: {
          department_code: string
          department_name: string
          region_code: string
          region_name: string
        }
        Update: {
          department_code?: string
          department_name?: string
          region_code?: string
          region_name?: string
        }
        Relationships: []
      }
      impersonation_sessions: {
        Row: {
          admin_id: string
          created_at: string
          expires_at: string
          id: string
          reason: string
          revoked_at: string | null
          revoked_reason: string | null
          target_user_id: string
          ticket_id: string | null
        }
        Insert: {
          admin_id: string
          created_at?: string
          expires_at?: string
          id?: string
          reason: string
          revoked_at?: string | null
          revoked_reason?: string | null
          target_user_id: string
          ticket_id?: string | null
        }
        Update: {
          admin_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          reason?: string
          revoked_at?: string | null
          revoked_reason?: string | null
          target_user_id?: string
          ticket_id?: string | null
        }
        Relationships: []
      }
      import_batches: {
        Row: {
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
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
          deleted_at?: string | null
          deleted_by?: string | null
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
          deleted_at?: string | null
          deleted_by?: string | null
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
      kb_faq: {
        Row: {
          answer_simple: string
          audience: string
          created_at: string
          faq_id: string
          id: string
          is_published: boolean
          knowledge_id: string | null
          question: string
          tone: string
          updated_at: string
        }
        Insert: {
          answer_simple: string
          audience?: string
          created_at?: string
          faq_id: string
          id?: string
          is_published?: boolean
          knowledge_id?: string | null
          question: string
          tone?: string
          updated_at?: string
        }
        Update: {
          answer_simple?: string
          audience?: string
          created_at?: string
          faq_id?: string
          id?: string
          is_published?: boolean
          knowledge_id?: string | null
          question?: string
          tone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_faq_knowledge_id_fkey"
            columns: ["knowledge_id"]
            isOneToOne: false
            referencedRelation: "kb_knowledge"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_knowledge: {
        Row: {
          ai_usage: string[] | null
          applicable_if: Json | null
          business_impact: string
          created_at: string
          created_by: string | null
          description_long: string
          id: string
          is_active: boolean
          know_id: string
          not_applicable_if: Json | null
          pillar: string
          reliability_label: string
          source_id: string | null
          status: string
          sub_pillar: string | null
          title_short: string
          truth_type: string
          updated_at: string
          urgency: string
          version: number
        }
        Insert: {
          ai_usage?: string[] | null
          applicable_if?: Json | null
          business_impact: string
          created_at?: string
          created_by?: string | null
          description_long: string
          id?: string
          is_active?: boolean
          know_id: string
          not_applicable_if?: Json | null
          pillar: string
          reliability_label: string
          source_id?: string | null
          status?: string
          sub_pillar?: string | null
          title_short: string
          truth_type: string
          updated_at?: string
          urgency: string
          version?: number
        }
        Update: {
          ai_usage?: string[] | null
          applicable_if?: Json | null
          business_impact?: string
          created_at?: string
          created_by?: string | null
          description_long?: string
          id?: string
          is_active?: boolean
          know_id?: string
          not_applicable_if?: Json | null
          pillar?: string
          reliability_label?: string
          source_id?: string | null
          status?: string
          sub_pillar?: string | null
          title_short?: string
          truth_type?: string
          updated_at?: string
          urgency?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "kb_knowledge_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "kb_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_knowledge_versions: {
        Row: {
          change_summary: string | null
          created_at: string
          created_by: string | null
          id: string
          knowledge_id: string
          snapshot: Json
          version: number
        }
        Insert: {
          change_summary?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          knowledge_id: string
          snapshot: Json
          version: number
        }
        Update: {
          change_summary?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          knowledge_id?: string
          snapshot?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "kb_knowledge_versions_knowledge_id_fkey"
            columns: ["knowledge_id"]
            isOneToOne: false
            referencedRelation: "kb_knowledge"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_rules: {
        Row: {
          actions: Json
          conditions: Json
          created_at: string
          id: string
          is_active: boolean
          knowledge_id: string | null
          priority: number
          rule_id: string
          severity: string
          trigger: string
          updated_at: string
        }
        Insert: {
          actions?: Json
          conditions?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          knowledge_id?: string | null
          priority?: number
          rule_id: string
          severity?: string
          trigger: string
          updated_at?: string
        }
        Update: {
          actions?: Json
          conditions?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          knowledge_id?: string | null
          priority?: number
          rule_id?: string
          severity?: string
          trigger?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_rules_knowledge_id_fkey"
            columns: ["knowledge_id"]
            isOneToOne: false
            referencedRelation: "kb_knowledge"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_sources: {
        Row: {
          created_at: string
          default_reliability_label: string
          id: string
          notes_internal: string | null
          source_name: string
          source_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_reliability_label: string
          id?: string
          notes_internal?: string | null
          source_name: string
          source_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_reliability_label?: string
          id?: string
          notes_internal?: string | null
          source_name?: string
          source_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      kpi_objectives: {
        Row: {
          category: string | null
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          machine_label: string | null
          objective_amount_cents: number
          period_month: string
          scope: string
          site_id: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          machine_label?: string | null
          objective_amount_cents: number
          period_month: string
          scope: string
          site_id?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          machine_label?: string | null
          objective_amount_cents?: number
          period_month?: string
          scope?: string
          site_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kpi_objectives_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_objectives_site_id_fkey"
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
      mfa_challenges: {
        Row: {
          action: string
          created_at: string
          expires_at: string
          id: string
          ip_hash: string | null
          user_agent: string | null
          user_id: string
          verified_at: string | null
        }
        Insert: {
          action: string
          created_at?: string
          expires_at?: string
          id?: string
          ip_hash?: string | null
          user_agent?: string | null
          user_id: string
          verified_at?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          expires_at?: string
          id?: string
          ip_hash?: string | null
          user_agent?: string | null
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          archive_before_deletion: boolean
          audit_report_email: string | null
          audit_report_frequency: string | null
          created_at: string
          critical_actions_alerts: boolean
          deletion_alerts: boolean
          email_alerts: boolean
          id: string
          last_audit_report_sent_at: string | null
          maintenance_alerts: boolean
          member_removal_alerts: boolean
          notify_new_device_login: boolean
          permission_change_alerts: boolean
          push_alerts: boolean
          revenue_alerts: boolean
          trial_reminder: boolean
          updated_at: string
          user_id: string
          weekly_report: boolean
        }
        Insert: {
          archive_before_deletion?: boolean
          audit_report_email?: string | null
          audit_report_frequency?: string | null
          created_at?: string
          critical_actions_alerts?: boolean
          deletion_alerts?: boolean
          email_alerts?: boolean
          id?: string
          last_audit_report_sent_at?: string | null
          maintenance_alerts?: boolean
          member_removal_alerts?: boolean
          notify_new_device_login?: boolean
          permission_change_alerts?: boolean
          push_alerts?: boolean
          revenue_alerts?: boolean
          trial_reminder?: boolean
          updated_at?: string
          user_id: string
          weekly_report?: boolean
        }
        Update: {
          archive_before_deletion?: boolean
          audit_report_email?: string | null
          audit_report_frequency?: string | null
          created_at?: string
          critical_actions_alerts?: boolean
          deletion_alerts?: boolean
          email_alerts?: boolean
          id?: string
          last_audit_report_sent_at?: string | null
          maintenance_alerts?: boolean
          member_removal_alerts?: boolean
          notify_new_device_login?: boolean
          permission_change_alerts?: boolean
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
          categorie: string | null
          change_eur: number | null
          created_at: string
          dedupe_key: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          import_batch_id: string | null
          import_hash: string | null
          inserted_eur: number | null
          machine: string | null
          machine_name: string | null
          operation_category: string | null
          operation_date: string
          operation_time: string | null
          payment_mode: string | null
          price_cb: number | null
          price_esp: number | null
          price_eur: number | null
          price_fi: number | null
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
          categorie?: string | null
          change_eur?: number | null
          created_at?: string
          dedupe_key?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          import_batch_id?: string | null
          import_hash?: string | null
          inserted_eur?: number | null
          machine?: string | null
          machine_name?: string | null
          operation_category?: string | null
          operation_date: string
          operation_time?: string | null
          payment_mode?: string | null
          price_cb?: number | null
          price_esp?: number | null
          price_eur?: number | null
          price_fi?: number | null
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
          categorie?: string | null
          change_eur?: number | null
          created_at?: string
          dedupe_key?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          import_batch_id?: string | null
          import_hash?: string | null
          inserted_eur?: number | null
          machine?: string | null
          machine_name?: string | null
          operation_category?: string | null
          operation_date?: string
          operation_time?: string | null
          payment_mode?: string | null
          price_cb?: number | null
          price_esp?: number | null
          price_eur?: number | null
          price_fi?: number | null
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
      organization_privacy_settings: {
        Row: {
          allow_anonymous_site_data: boolean
          decided_at: string | null
          decided_by_user_id: string | null
          organization_id: string
          updated_at: string
        }
        Insert: {
          allow_anonymous_site_data?: boolean
          decided_at?: string | null
          decided_by_user_id?: string | null
          organization_id: string
          updated_at?: string
        }
        Update: {
          allow_anonymous_site_data?: boolean
          decided_at?: string | null
          decided_by_user_id?: string | null
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_privacy_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          beta_ends_at: string | null
          beta_price_cents: number | null
          beta_started_at: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_beta: boolean
          name: string
          owner_id: string
          standard_price_cents: number
          updated_at: string
        }
        Insert: {
          beta_ends_at?: string | null
          beta_price_cents?: number | null
          beta_started_at?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_beta?: boolean
          name: string
          owner_id: string
          standard_price_cents?: number
          updated_at?: string
        }
        Update: {
          beta_ends_at?: string | null
          beta_price_cents?: number | null
          beta_started_at?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_beta?: boolean
          name?: string
          owner_id?: string
          standard_price_cents?: number
          updated_at?: string
        }
        Relationships: []
      }
      orphan_page_reviews: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          route_path: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          route_path: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          route_path?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      paywall_bypass_allowlist: {
        Row: {
          created_at: string | null
          email: string
          id: string
          reason: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          reason?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          reason?: string | null
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
      platform_feature_flags: {
        Row: {
          description: string | null
          is_enabled: boolean
          key: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          description?: string | null
          is_enabled?: boolean
          key: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          description?: string | null
          is_enabled?: boolean
          key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      platform_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["platform_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["platform_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["platform_role"]
          user_id?: string
        }
        Relationships: []
      }
      privacy_consent_audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_hash: string | null
          new_value: boolean
          old_value: boolean | null
          organization_id: string
          performed_by: string
          user_agent: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_hash?: string | null
          new_value: boolean
          old_value?: boolean | null
          organization_id: string
          performed_by: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_hash?: string | null
          new_value?: boolean
          old_value?: boolean | null
          organization_id?: string
          performed_by?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "privacy_consent_audit_logs_organization_id_fkey"
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
      projects: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
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
      recovery_codes: {
        Row: {
          code_hash: string
          created_at: string
          id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          code_hash: string
          created_at?: string
          id?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          code_hash?: string
          created_at?: string
          id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      simulator_lead_rate_limits: {
        Row: {
          created_at: string
          email: string | null
          id: number
          ip_hash: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: number
          ip_hash: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: number
          ip_hash?: string
        }
        Relationships: []
      }
      simulator_leads: {
        Row: {
          ab_variant: string | null
          capital_range: string | null
          created_at: string
          email: string
          estimated_annual_revenue: number | null
          estimated_monthly_revenue: number | null
          gap_score: number | null
          ici_score: number | null
          id: string
          machine_range: string | null
          pricing_snapshot: Json | null
          segmentation_type: string | null
          stage: string | null
          zone_selected: string | null
        }
        Insert: {
          ab_variant?: string | null
          capital_range?: string | null
          created_at?: string
          email: string
          estimated_annual_revenue?: number | null
          estimated_monthly_revenue?: number | null
          gap_score?: number | null
          ici_score?: number | null
          id?: string
          machine_range?: string | null
          pricing_snapshot?: Json | null
          segmentation_type?: string | null
          stage?: string | null
          zone_selected?: string | null
        }
        Update: {
          ab_variant?: string | null
          capital_range?: string | null
          created_at?: string
          email?: string
          estimated_annual_revenue?: number | null
          estimated_monthly_revenue?: number | null
          gap_score?: number | null
          ici_score?: number | null
          id?: string
          machine_range?: string | null
          pricing_snapshot?: Json | null
          segmentation_type?: string | null
          stage?: string | null
          zone_selected?: string | null
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
      site_analytics_state: {
        Row: {
          analytics_version: number
          last_import_at: string | null
          last_import_status: string | null
          site_id: string
          updated_at: string | null
        }
        Insert: {
          analytics_version?: number
          last_import_at?: string | null
          last_import_status?: string | null
          site_id: string
          updated_at?: string | null
        }
        Update: {
          analytics_version?: number
          last_import_at?: string | null
          last_import_status?: string | null
          site_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_analytics_state_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: true
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
          closed_at: string | null
          closed_by: string | null
          country_code: string | null
          created_at: string
          csv_type: string | null
          deleted_at: string | null
          deleted_by: string | null
          department_code: string | null
          id: string
          is_default: boolean | null
          is_demo: boolean
          name: string
          organization_id: string | null
          postal_code: string | null
          provider: string | null
          reactivated_at: string | null
          reactivated_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          closed_at?: string | null
          closed_by?: string | null
          country_code?: string | null
          created_at?: string
          csv_type?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          department_code?: string | null
          id?: string
          is_default?: boolean | null
          is_demo?: boolean
          name: string
          organization_id?: string | null
          postal_code?: string | null
          provider?: string | null
          reactivated_at?: string | null
          reactivated_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          city?: string | null
          closed_at?: string | null
          closed_by?: string | null
          country_code?: string | null
          created_at?: string
          csv_type?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          department_code?: string | null
          id?: string
          is_default?: boolean | null
          is_demo?: boolean
          name?: string
          organization_id?: string | null
          postal_code?: string | null
          provider?: string | null
          reactivated_at?: string | null
          reactivated_by?: string | null
          status?: string
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
      stripe_invoices: {
        Row: {
          amount_subtotal: number | null
          amount_tax: number | null
          amount_total: number | null
          created_at: string | null
          currency: string | null
          customer_email: string | null
          hosted_invoice_url: string | null
          id: string
          invoice_pdf: string | null
          lines: Json | null
          metadata: Json | null
          paid_at: string | null
          status: string | null
          stripe_customer_id: string | null
          stripe_invoice_id: string
          stripe_subscription_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount_subtotal?: number | null
          amount_tax?: number | null
          amount_total?: number | null
          created_at?: string | null
          currency?: string | null
          customer_email?: string | null
          hosted_invoice_url?: string | null
          id?: string
          invoice_pdf?: string | null
          lines?: Json | null
          metadata?: Json | null
          paid_at?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_invoice_id: string
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount_subtotal?: number | null
          amount_tax?: number | null
          amount_total?: number | null
          created_at?: string | null
          currency?: string | null
          customer_email?: string | null
          hosted_invoice_url?: string | null
          id?: string
          invoice_pdf?: string | null
          lines?: Json | null
          metadata?: Json | null
          paid_at?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_invoice_id?: string
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id?: string | null
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
          trial_used: boolean
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
          trial_used?: boolean
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
          trial_used?: boolean
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      system_events: {
        Row: {
          code: string | null
          created_at: string | null
          env: string
          id: number
          message: string
          meta: Json | null
          severity: string
          source: string
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          env?: string
          id?: number
          message: string
          meta?: Json | null
          severity: string
          source: string
        }
        Update: {
          code?: string | null
          created_at?: string | null
          env?: string
          id?: number
          message?: string
          meta?: Json | null
          severity?: string
          source?: string
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
      trust_day: {
        Row: {
          company_id: string
          created_at: string
          day: string
          dts_score: number
          excluded_revenue: number
          id: string
          invalid_rate: number
          top_flags: Json | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          day: string
          dts_score: number
          excluded_revenue?: number
          id?: string
          invalid_rate?: number
          top_flags?: Json | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          day?: string
          dts_score?: number
          excluded_revenue?: number
          id?: string
          invalid_rate?: number
          top_flags?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trust_day_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      trust_import: {
        Row: {
          company_id: string
          created_at: string
          dts_score: number
          duplicate_rate: number
          id: string
          import_id: string
          invalid_rate: number
          mapping_rate: number
          top_flags: Json | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          dts_score: number
          duplicate_rate?: number
          id?: string
          import_id: string
          invalid_rate?: number
          mapping_rate?: number
          top_flags?: Json | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          dts_score?: number
          duplicate_rate?: number
          id?: string
          import_id?: string
          invalid_rate?: number
          mapping_rate?: number
          top_flags?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trust_import_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trust_import_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      trust_line: {
        Row: {
          company_id: string
          created_at: string
          dts_score: number
          flags: string[] | null
          id: string
          import_id: string | null
          is_blocking_invalid: boolean
          occurred_at: string | null
          operation_id: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          dts_score: number
          flags?: string[] | null
          id?: string
          import_id?: string | null
          is_blocking_invalid?: boolean
          occurred_at?: string | null
          operation_id: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          dts_score?: number
          flags?: string[] | null
          id?: string
          import_id?: string | null
          is_blocking_invalid?: boolean
          occurred_at?: string | null
          operation_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trust_line_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trust_line_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trust_line_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: true
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
        ]
      }
      trusted_devices: {
        Row: {
          created_at: string
          device_id: string
          device_name: string | null
          id: string
          last_used_at: string
          trusted_until: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_id: string
          device_name?: string | null
          id?: string
          last_used_at?: string
          trusted_until: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_id?: string
          device_name?: string | null
          id?: string
          last_used_at?: string
          trusted_until?: string
          user_id?: string
        }
        Relationships: []
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
      ux_feedback: {
        Row: {
          clarity_score: string
          company_id: string | null
          created_at: string
          id: string
          issue_type: string | null
          message: string | null
          page_path: string
          user_id: string | null
          user_role: string | null
        }
        Insert: {
          clarity_score: string
          company_id?: string | null
          created_at?: string
          id?: string
          issue_type?: string | null
          message?: string | null
          page_path: string
          user_id?: string | null
          user_role?: string | null
        }
        Update: {
          clarity_score?: string
          company_id?: string | null
          created_at?: string
          id?: string
          issue_type?: string | null
          message?: string | null
          page_path?: string
          user_id?: string | null
          user_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ux_feedback_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_data_quality_operations: {
        Row: {
          esp_topup_missing_sales_candidates: number | null
          missing_operation_date: number | null
          missing_site_id: number | null
          suspicious_amounts_centimes: number | null
          total_operations: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      bump_analytics_version: {
        Args: { p_site_id: string; p_status?: string }
        Returns: number
      }
      check_duplicate_sites: {
        Args: {
          p_address: string
          p_city: string
          p_country?: string
          p_name: string
          p_postal_code: string
        }
        Returns: {
          address: string
          city: string
          country_code: string
          id: string
          name: string
          owner_id: string
          postal_code: string
        }[]
      }
      classify_operation_category: {
        Args: { p_description: string; p_machine?: string }
        Returns: string
      }
      cleanup_expired_login_otps: { Args: never; Returns: undefined }
      cleanup_expired_mfa_challenges: { Args: never; Returns: undefined }
      cleanup_expired_trusted_devices: { Args: never; Returns: undefined }
      cleanup_old_cron_logs: { Args: never; Returns: undefined }
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      cleanup_old_system_events: { Args: never; Returns: undefined }
      compute_dts_for_import: {
        Args: { p_company_id: string; p_import_id: string }
        Returns: Json
      }
      count_recovery_codes: { Args: { p_user_id: string }; Returns: number }
      derive_department_code: { Args: { postal_code: string }; Returns: string }
      fn_classify_operation_category: {
        Args: { p_machine: string; p_program: string }
        Returns: string
      }
      get_last_login_country: { Args: { p_user_id: string }; Returns: string }
      get_user_org_id: { Args: { _user_id: string }; Returns: string }
      grant_platform_role: {
        Args: {
          p_email: string
          p_role: Database["public"]["Enums"]["platform_role"]
        }
        Returns: Json
      }
      has_org_role: {
        Args: {
          _org_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_valid_mfa_session: {
        Args: { p_action: string; p_user_id: string }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_company_admin: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_device_trusted: {
        Args: { p_device_id: string; p_user_id: string }
        Returns: boolean
      }
      is_org_admin: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_platform_admin: { Args: { uid?: string }; Returns: boolean }
      is_platform_billing: { Args: { uid?: string }; Returns: boolean }
      is_platform_super_admin: { Args: { uid?: string }; Returns: boolean }
      owns_fin_project: { Args: { proj_id: string }; Returns: boolean }
      owns_fin_workspace: { Args: { ws_id: string }; Returns: boolean }
      owns_operation_site: {
        Args: { _site_id: string; _user_id: string }
        Returns: boolean
      }
      owns_site: { Args: { _site_id: string }; Returns: boolean }
      restore_fin_project: {
        Args: { p_project_id: string }
        Returns: undefined
      }
      rpc_admin_churn_predictions: { Args: never; Returns: Json }
      rpc_admin_global_search: {
        Args: { p_limit?: number; p_query: string }
        Returns: Json
      }
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
      rpc_beta_billing_check: {
        Args: never
        Returns: {
          active_laundromats_count: number
          beta_ends_at: string
          beta_started_at: string
          company_id: string
          company_name: string
          effective_price_cents: number
          estimated_monthly_amount: number
          warnings: Json
        }[]
      }
      rpc_beta_ops_actions_log: {
        Args: { p_limit?: number }
        Returns: {
          action_type: string
          actor_user_id: string
          company_id: string
          created_at: string
          id: number
          message: string
          meta: Json
        }[]
      }
      rpc_beta_ops_alerts: {
        Args: never
        Returns: {
          alert_reason: string
          alert_type: string
          company_id: string
          company_name: string
          detected_at: string
          severity: string
        }[]
      }
      rpc_beta_ops_overview: {
        Args: never
        Returns: {
          company_id: string
          company_name: string
          days_since_activity: number
          dts_avg_7d: number
          export_failures_7d: number
          feedback_count_7d: number
          import_flag_rate: number
          last_activity: string
          recommendations_suppressed: boolean
        }[]
      }
      rpc_compute_fin_forecast: {
        Args: {
          p_horizon_years?: number
          p_project_id: string
          p_scenario_id?: string
        }
        Returns: Json
      }
      rpc_compute_line_revenue: {
        Args: {
          p_month?: number
          p_project_id: string
          p_scenario_id?: string
          p_year?: number
        }
        Returns: Json
      }
      rpc_convert_fin_to_operations: {
        Args: { p_project_id: string; p_site_name?: string }
        Returns: string
      }
      rpc_create_audit_log: {
        Args: {
          p_action: string
          p_actor_id: string
          p_ip_hash?: string
          p_metadata?: Json
          p_target_id?: string
          p_target_table: string
          p_user_agent?: string
        }
        Returns: string
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
      rpc_data_quality_check: {
        Args: never
        Returns: {
          esp_topup_missing_sales_candidates: number
          missing_operation_date: number
          missing_site_id: number
          suspicious_amounts_centimes: number
          total_operations: number
        }[]
      }
      rpc_data_quality_stats: {
        Args: { p_end_date?: string; p_site_id: string; p_start_date?: string }
        Returns: {
          distinct_days: number
          max_date: string
          max_hour: number
          min_date: string
          min_hour: number
          operations_count: number
          total_revenue: number
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
      rpc_effective_price_per_laundromat: {
        Args: { p_organization_id: string }
        Returns: number
      }
      rpc_get_ai_usage_today: { Args: { p_actor_id: string }; Returns: Json }
      rpc_get_benchmarks: {
        Args: { p_end_date: string; p_site_id: string; p_start_date: string }
        Returns: Json
      }
      rpc_get_company_beta_status: {
        Args: { p_organization_id: string }
        Returns: Json
      }
      rpc_get_fin_export_data: { Args: { p_project_id: string }; Returns: Json }
      rpc_get_fin_pdf_bundle: {
        Args: { p_project_id: string; p_scenario_id?: string }
        Returns: Json
      }
      rpc_get_or_create_fin_workspace: {
        Args: {
          p_access_days?: number
          p_max_projects?: number
          p_max_scenarios?: number
          p_plan_code?: string
        }
        Returns: string
      }
      rpc_has_fin_access: { Args: never; Returns: Json }
      rpc_has_paywall_bypass: { Args: never; Returns: boolean }
      rpc_increment_ai_usage: {
        Args: {
          p_actor_id: string
          p_daily_cost_limit?: number
          p_daily_request_limit?: number
          p_estimated_cost?: number
          p_tokens_in?: number
          p_tokens_out?: number
        }
        Returns: Json
      }
      rpc_is_recommendations_suppressed: {
        Args: { p_organization_id: string }
        Returns: boolean
      }
      rpc_log_beta_contact: {
        Args: { p_channel: string; p_company_id: string; p_notes: string }
        Returns: Json
      }
      rpc_log_billing_check_view: { Args: never; Returns: undefined }
      rpc_log_system_event: {
        Args: {
          p_code: string
          p_env: string
          p_message: string
          p_meta: Json
          p_severity: string
          p_source: string
        }
        Returns: undefined
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
      rpc_operations_period_kpis: {
        Args: {
          p_end_date?: string
          p_payment_mode?: string
          p_search?: string
          p_site_id: string
          p_start_date?: string
        }
        Returns: {
          ca_cb: number
          ca_esp: number
          op_count: number
          total_ca: number
        }[]
      }
      rpc_platform_admin_beta_companies: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: Json
      }
      rpc_platform_admin_billing: {
        Args: { p_limit?: number; p_offset?: number; p_status?: string }
        Returns: Json
      }
      rpc_platform_admin_geo: { Args: { p_min_sites?: number }; Returns: Json }
      rpc_platform_admin_invoices: {
        Args: {
          p_end_date?: string
          p_limit?: number
          p_offset?: number
          p_start_date?: string
          p_status?: string
        }
        Returns: Json
      }
      rpc_platform_admin_monthly_revenue: {
        Args: { p_year?: number }
        Returns: Json
      }
      rpc_platform_admin_products_sales: {
        Args: { p_year?: number }
        Returns: Json
      }
      rpc_platform_admin_sales_overview: {
        Args: { p_month?: number; p_year?: number }
        Returns: Json
      }
      rpc_platform_admin_sites: {
        Args: {
          p_department?: string
          p_limit?: number
          p_offset?: number
          p_region?: string
          p_search?: string
        }
        Returns: Json
      }
      rpc_platform_admin_stats: { Args: never; Returns: Json }
      rpc_platform_admin_users: {
        Args: { p_limit?: number; p_offset?: number; p_search?: string }
        Returns: Json
      }
      rpc_recalc_latest_dts: { Args: { p_company_id: string }; Returns: Json }
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
      rpc_record_mfa_event: {
        Args: {
          p_action: string
          p_event_type: string
          p_ip_hash?: string
          p_success: boolean
          p_user_agent?: string
        }
        Returns: undefined
      }
      rpc_run_smoke_tests: {
        Args: { p_site_id: string }
        Returns: {
          details: string
          ok: boolean
          test_key: string
        }[]
      }
      rpc_save_fin_snapshot: { Args: { p_project_id: string }; Returns: number }
      rpc_stripe_last_event: {
        Args: never
        Returns: {
          created_at: string
          event_type: string
        }[]
      }
      rpc_toggle_recommendations_suppression: {
        Args: { p_company_id: string; p_reason?: string; p_suppressed: boolean }
        Returns: Json
      }
      soft_delete_fin_project: {
        Args: { p_project_id: string }
        Returns: undefined
      }
      soft_delete_operation: {
        Args: { operation_id: string }
        Returns: undefined
      }
      trigger_compute_analytics_cron: { Args: never; Returns: undefined }
      user_belongs_to_org: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      user_company_id: { Args: { p_user_id: string }; Returns: string }
      was_device_seen_recently: {
        Args: { p_device_id: string; p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "admin"
        | "checker"
        | "user"
        | "guest"
        | "company_admin"
      fin_export_format: "PDF" | "XLSX"
      fin_export_status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED"
      fin_hypothesis_category: "INVESTMENT" | "REVENUE" | "COST" | "FINANCING"
      fin_line_item_category: "CYCLE" | "PRODUCT" | "OPTION"
      fin_project_status: "DRAFT" | "ACTIVE" | "ARCHIVED"
      platform_role: "super_admin" | "admin" | "billing"
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
      app_role: [
        "super_admin",
        "admin",
        "checker",
        "user",
        "guest",
        "company_admin",
      ],
      fin_export_format: ["PDF", "XLSX"],
      fin_export_status: ["PENDING", "PROCESSING", "COMPLETED", "FAILED"],
      fin_hypothesis_category: ["INVESTMENT", "REVENUE", "COST", "FINANCING"],
      fin_line_item_category: ["CYCLE", "PRODUCT", "OPTION"],
      fin_project_status: ["DRAFT", "ACTIVE", "ARCHIVED"],
      platform_role: ["super_admin", "admin", "billing"],
    },
  },
} as const
