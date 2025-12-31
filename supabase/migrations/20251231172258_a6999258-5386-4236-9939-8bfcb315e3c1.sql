-- Create permission audit logs table
CREATE TABLE public.permission_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  performed_by UUID NOT NULL,
  target_user_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  action TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  ip_hash TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.permission_audit_logs ENABLE ROW LEVEL SECURITY;

-- Super admins can view audit logs for their org
CREATE POLICY "Super admins can view permission audit logs"
ON public.permission_audit_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.organization_id = permission_audit_logs.organization_id
      AND user_roles.role = 'super_admin'
  )
);

-- Service role can insert audit logs (for edge functions)
CREATE POLICY "Service role can insert audit logs"
ON public.permission_audit_logs
FOR INSERT
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_permission_audit_logs_org ON public.permission_audit_logs(organization_id);
CREATE INDEX idx_permission_audit_logs_target ON public.permission_audit_logs(target_user_id);
CREATE INDEX idx_permission_audit_logs_created ON public.permission_audit_logs(created_at DESC);