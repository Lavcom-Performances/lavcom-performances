-- Create export_jobs table for async export processing
CREATE TABLE public.export_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_scope TEXT NOT NULL CHECK (role_scope IN ('platform_admin', 'saas_user')),
  company_id UUID NULL,
  site_id UUID NULL REFERENCES public.sites(id) ON DELETE SET NULL,
  export_type TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'success', 'failed', 'expired', 'canceled')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  error_message TEXT NULL,
  result_path TEXT NULL,
  result_filename TEXT NULL,
  result_mime TEXT NOT NULL DEFAULT 'text/csv',
  expires_at TIMESTAMPTZ NULL,
  started_at TIMESTAMPTZ NULL,
  finished_at TIMESTAMPTZ NULL
);

-- Create indexes for efficient queries
CREATE INDEX idx_export_jobs_created_by_created_at ON public.export_jobs(created_by, created_at DESC);
CREATE INDEX idx_export_jobs_company_created_at ON public.export_jobs(company_id, created_at DESC);
CREATE INDEX idx_export_jobs_status_created_at ON public.export_jobs(status, created_at);
CREATE INDEX idx_export_jobs_type_created_at ON public.export_jobs(export_type, created_at);

-- Trigger for updated_at
CREATE TRIGGER set_export_jobs_updated_at
  BEFORE UPDATE ON public.export_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.export_jobs ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user belongs to a company (organization)
CREATE OR REPLACE FUNCTION public.user_company_id(p_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.user_roles
  WHERE user_id = p_user_id
  LIMIT 1
$$;

-- RLS Policy 1: SaaS users can SELECT their own jobs within their company
CREATE POLICY "saas_users_select_own_jobs"
ON public.export_jobs
FOR SELECT
TO authenticated
USING (
  role_scope = 'saas_user'
  AND created_by = auth.uid()
  AND company_id = public.user_company_id(auth.uid())
);

-- RLS Policy 2: Platform admins can SELECT platform_admin scoped jobs
CREATE POLICY "platform_admins_select_jobs"
ON public.export_jobs
FOR SELECT
TO authenticated
USING (
  role_scope = 'platform_admin'
  AND public.is_platform_admin(auth.uid())
);

-- RLS Policy 3: SaaS users can INSERT jobs for their company only
CREATE POLICY "saas_users_insert_jobs"
ON public.export_jobs
FOR INSERT
TO authenticated
WITH CHECK (
  role_scope = 'saas_user'
  AND created_by = auth.uid()
  AND company_id = public.user_company_id(auth.uid())
  AND company_id IS NOT NULL
);

-- RLS Policy 4: Platform admins can INSERT platform_admin scoped jobs
CREATE POLICY "platform_admins_insert_jobs"
ON public.export_jobs
FOR INSERT
TO authenticated
WITH CHECK (
  role_scope = 'platform_admin'
  AND created_by = auth.uid()
  AND public.is_platform_admin(auth.uid())
);

-- RLS Policy 5: SaaS users can UPDATE only to cancel their own jobs
CREATE POLICY "saas_users_cancel_own_jobs"
ON public.export_jobs
FOR UPDATE
TO authenticated
USING (
  role_scope = 'saas_user'
  AND created_by = auth.uid()
  AND company_id = public.user_company_id(auth.uid())
  AND status = 'queued'
)
WITH CHECK (
  status = 'canceled'
);

-- RLS Policy 6: Platform admins can UPDATE their own queued jobs to cancel
CREATE POLICY "platform_admins_cancel_jobs"
ON public.export_jobs
FOR UPDATE
TO authenticated
USING (
  role_scope = 'platform_admin'
  AND created_by = auth.uid()
  AND public.is_platform_admin(auth.uid())
  AND status = 'queued'
)
WITH CHECK (
  status = 'canceled'
);

-- Create storage bucket for exports (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'exports',
  'exports',
  false,
  52428800, -- 50MB limit
  ARRAY['text/csv', 'application/pdf', 'application/json']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: Only service role can insert/update/delete (handled by edge functions)
-- Users can only read their own exports via signed URLs

CREATE POLICY "service_role_manage_exports"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'exports')
WITH CHECK (bucket_id = 'exports');