-- Add critical action notification preferences to notification_preferences table
ALTER TABLE public.notification_preferences
ADD COLUMN IF NOT EXISTS critical_actions_alerts BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS permission_change_alerts BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS member_removal_alerts BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS deletion_alerts BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS archive_before_deletion BOOLEAN NOT NULL DEFAULT true;

-- Create storage bucket for audit log archives
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('audit-archives', 'audit-archives', false, 52428800, ARRAY['application/json', 'application/gzip'])
ON CONFLICT (id) DO NOTHING;

-- RLS policies for audit-archives bucket - only service role can write, users can read their own archives
CREATE POLICY "Users can view their own audit archives"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'audit-archives' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Service role can manage audit archives"
ON storage.objects FOR ALL
USING (
  bucket_id = 'audit-archives' 
  AND auth.role() = 'service_role'
);

-- Create table to track archived audit log batches
CREATE TABLE IF NOT EXISTS public.audit_log_archives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  file_path TEXT NOT NULL,
  records_count INTEGER NOT NULL DEFAULT 0,
  date_range_start TIMESTAMP WITH TIME ZONE NOT NULL,
  date_range_end TIMESTAMP WITH TIME ZONE NOT NULL,
  file_size_bytes BIGINT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on audit_log_archives
ALTER TABLE public.audit_log_archives ENABLE ROW LEVEL SECURITY;

-- Users can only view their own archives
CREATE POLICY "Users can view their own audit log archives"
ON public.audit_log_archives FOR SELECT
USING (auth.uid() = user_id);

-- Service role can insert archives
CREATE POLICY "Service role can insert audit log archives"
ON public.audit_log_archives FOR INSERT
WITH CHECK (true);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_audit_log_archives_user_id ON public.audit_log_archives(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_archives_created_at ON public.audit_log_archives(created_at DESC);