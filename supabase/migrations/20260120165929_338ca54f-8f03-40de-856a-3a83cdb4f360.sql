-- Create private bucket for compliance reports
INSERT INTO storage.buckets (id, name, public)
VALUES ('compliance-reports', 'compliance-reports', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for compliance-reports bucket (platform admins only)
CREATE POLICY "Platform admins can list compliance reports"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'compliance-reports' 
  AND (
    public.is_platform_super_admin(auth.uid()) 
    OR public.is_platform_admin(auth.uid())
  )
);

CREATE POLICY "Service role can insert compliance reports"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'compliance-reports'
);

CREATE POLICY "Service role can delete compliance reports"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'compliance-reports'
);

-- Add sha256_checksum and file_path to compliance_reports table
ALTER TABLE public.compliance_reports 
ADD COLUMN IF NOT EXISTS sha256_checksum TEXT,
ADD COLUMN IF NOT EXISTS file_path TEXT,
ADD COLUMN IF NOT EXISTS retention_years INTEGER DEFAULT 2;

-- Add index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_compliance_reports_generated_at 
ON public.compliance_reports (generated_at);

-- Add comment for documentation
COMMENT ON COLUMN public.compliance_reports.sha256_checksum IS 'SHA-256 checksum for tamper detection';
COMMENT ON COLUMN public.compliance_reports.file_path IS 'Path to the report file in storage';
COMMENT ON COLUMN public.compliance_reports.retention_years IS 'Retention period in years (1-5)';