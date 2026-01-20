-- Create compliance_reports table to store report history
CREATE TABLE public.compliance_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  period_label TEXT NOT NULL,
  date_range_start DATE NOT NULL,
  date_range_end DATE NOT NULL,
  total_archives INTEGER NOT NULL DEFAULT 0,
  verified_valid INTEGER NOT NULL DEFAULT 0,
  verified_invalid INTEGER NOT NULL DEFAULT 0,
  no_checksum INTEGER NOT NULL DEFAULT 0,
  file_missing INTEGER NOT NULL DEFAULT 0,
  errors INTEGER NOT NULL DEFAULT 0,
  integrity_score INTEGER NOT NULL DEFAULT 0,
  total_storage_bytes BIGINT DEFAULT 0,
  generated_by UUID REFERENCES auth.users(id),
  report_type TEXT NOT NULL DEFAULT 'manual', -- 'manual' or 'scheduled'
  report_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.compliance_reports ENABLE ROW LEVEL SECURITY;

-- Only platform admins can view and create compliance reports
CREATE POLICY "Platform admins can view compliance reports"
ON public.compliance_reports
FOR SELECT
USING (public.is_platform_admin() OR public.is_platform_super_admin());

CREATE POLICY "Platform admins can create compliance reports"
ON public.compliance_reports
FOR INSERT
WITH CHECK (public.is_platform_admin() OR public.is_platform_super_admin());

-- Create index for faster queries
CREATE INDEX idx_compliance_reports_generated_at ON public.compliance_reports(generated_at DESC);
CREATE INDEX idx_compliance_reports_report_type ON public.compliance_reports(report_type);