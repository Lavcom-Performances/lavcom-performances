-- Create private bucket for diagnostics bundles
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'diagnostics-bundles',
  'diagnostics-bundles',
  false,
  10485760, -- 10MB limit
  ARRAY['application/json']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policy: Only platform admins can access diagnostics bundles
CREATE POLICY "Platform admins can manage diagnostics bundles"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'diagnostics-bundles'
  AND EXISTS (
    SELECT 1 FROM public.platform_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
)
WITH CHECK (
  bucket_id = 'diagnostics-bundles'
  AND EXISTS (
    SELECT 1 FROM public.platform_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

-- Create table to track diagnostics bundles metadata
CREATE TABLE IF NOT EXISTS public.diagnostics_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id UUID NOT NULL,
  actor_email TEXT,
  site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
  date_from DATE,
  date_to DATE,
  file_path TEXT NOT NULL,
  file_size_bytes BIGINT,
  bundle_summary JSONB,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours')
);

-- Enable RLS
ALTER TABLE public.diagnostics_bundles ENABLE ROW LEVEL SECURITY;

-- Only platform admins can view/create bundles
CREATE POLICY "Platform admins can view diagnostics bundles"
ON public.diagnostics_bundles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.platform_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Platform admins can insert diagnostics bundles"
ON public.diagnostics_bundles
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.platform_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

-- Index for faster queries
CREATE INDEX idx_diagnostics_bundles_created_at ON public.diagnostics_bundles(created_at DESC);
CREATE INDEX idx_diagnostics_bundles_actor_id ON public.diagnostics_bundles(actor_id);