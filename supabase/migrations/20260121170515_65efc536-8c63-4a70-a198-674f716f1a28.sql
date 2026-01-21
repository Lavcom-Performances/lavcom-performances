-- Create impersonation_sessions table for tracking admin impersonation of users
CREATE TABLE public.impersonation_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL,
  target_user_id UUID NOT NULL,
  reason TEXT NOT NULL,
  ticket_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '30 minutes'),
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoked_reason TEXT
);

-- Create index for faster lookups
CREATE INDEX idx_impersonation_sessions_admin_id ON public.impersonation_sessions(admin_id);
CREATE INDEX idx_impersonation_sessions_target_user_id ON public.impersonation_sessions(target_user_id);
CREATE INDEX idx_impersonation_sessions_active ON public.impersonation_sessions(admin_id, expires_at) 
  WHERE revoked_at IS NULL;

-- Enable RLS
ALTER TABLE public.impersonation_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Super admins can create sessions
CREATE POLICY "Super admins can create impersonation sessions"
ON public.impersonation_sessions
FOR INSERT
WITH CHECK (is_platform_super_admin(auth.uid()));

-- Policy: Super admins can revoke sessions (update revoked_at)
CREATE POLICY "Super admins can revoke impersonation sessions"
ON public.impersonation_sessions
FOR UPDATE
USING (is_platform_super_admin(auth.uid()));

-- Policy: Platform admins can view all sessions, super_admin can view all
CREATE POLICY "Platform admins can view impersonation sessions"
ON public.impersonation_sessions
FOR SELECT
USING (
  is_platform_super_admin(auth.uid()) 
  OR (is_platform_admin(auth.uid()) AND admin_id = auth.uid())
);

-- Policy: Service role can manage (for edge functions)
CREATE POLICY "Service role can manage impersonation sessions"
ON public.impersonation_sessions
FOR ALL
USING (true)
WITH CHECK (true);

-- Add comment for documentation
COMMENT ON TABLE public.impersonation_sessions IS 'Tracks platform admin impersonation sessions for support purposes';
COMMENT ON COLUMN public.impersonation_sessions.admin_id IS 'The super_admin who initiated the impersonation';
COMMENT ON COLUMN public.impersonation_sessions.target_user_id IS 'The user being impersonated';
COMMENT ON COLUMN public.impersonation_sessions.reason IS 'Required reason for the impersonation';
COMMENT ON COLUMN public.impersonation_sessions.ticket_id IS 'Optional support ticket reference';
COMMENT ON COLUMN public.impersonation_sessions.expires_at IS 'Auto-expires after 30 minutes';
COMMENT ON COLUMN public.impersonation_sessions.revoked_at IS 'When the session was manually ended';