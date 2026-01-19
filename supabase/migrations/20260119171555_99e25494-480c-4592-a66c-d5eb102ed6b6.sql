-- Create privacy consent audit log table
CREATE TABLE public.privacy_consent_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  performed_by UUID NOT NULL,
  action TEXT NOT NULL, -- 'consent_granted' | 'consent_revoked'
  old_value BOOLEAN,
  new_value BOOLEAN NOT NULL,
  ip_hash TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.privacy_consent_audit_logs ENABLE ROW LEVEL SECURITY;

-- Super admins and company admins can view audit logs for their org
CREATE POLICY "Org admins can view privacy consent audit logs"
ON public.privacy_consent_audit_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.organization_id = privacy_consent_audit_logs.organization_id
      AND user_roles.role IN ('super_admin', 'company_admin', 'admin')
  )
);

-- Allow authenticated users to insert their own logs (the lib function handles this)
CREATE POLICY "Authenticated users can insert own audit logs"
ON public.privacy_consent_audit_logs
FOR INSERT
WITH CHECK (auth.uid() = performed_by);

-- Create indexes for faster lookups
CREATE INDEX idx_privacy_consent_audit_org ON public.privacy_consent_audit_logs(organization_id);
CREATE INDEX idx_privacy_consent_audit_created ON public.privacy_consent_audit_logs(created_at DESC);