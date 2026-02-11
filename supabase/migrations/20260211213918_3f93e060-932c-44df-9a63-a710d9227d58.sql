
-- Create backup_jobs table
CREATE TABLE public.backup_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  triggered_by uuid NOT NULL,
  trigger_type text NOT NULL CHECK (trigger_type IN ('manual', 'cron')),
  status text NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  total_size bigint DEFAULT 0,
  error_message text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_backup_jobs_status ON public.backup_jobs(status);
CREATE INDEX idx_backup_jobs_created_at ON public.backup_jobs(created_at DESC);

-- Create backup_files table
CREATE TABLE public.backup_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_job_id uuid NOT NULL REFERENCES public.backup_jobs(id) ON DELETE CASCADE,
  file_type text NOT NULL CHECK (file_type IN ('database', 'storage')),
  file_path text NOT NULL,
  file_size bigint NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.backup_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_files ENABLE ROW LEVEL SECURITY;

-- RLS: SELECT only for super_admin (via platform_roles)
CREATE POLICY "Super admins can view backup jobs"
ON public.backup_jobs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.platform_roles
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
  )
);

CREATE POLICY "Super admins can view backup files"
ON public.backup_files FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.platform_roles
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
  )
);

-- INSERT/UPDATE via service_role only (no policy for authenticated insert)
-- Service role bypasses RLS automatically

-- Create private backups storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('backups', 'backups', false);

-- Storage RLS: only super_admin can read from backups bucket
CREATE POLICY "Super admins can read backups"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'backups'
  AND EXISTS (
    SELECT 1 FROM public.platform_roles
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
  )
);
