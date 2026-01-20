-- Add report frequency columns to notification_preferences
ALTER TABLE public.notification_preferences
ADD COLUMN IF NOT EXISTS audit_report_frequency text DEFAULT 'none'::text CHECK (audit_report_frequency IN ('none', 'weekly', 'monthly')),
ADD COLUMN IF NOT EXISTS audit_report_email text,
ADD COLUMN IF NOT EXISTS last_audit_report_sent_at timestamptz;