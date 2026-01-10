-- Create admin login history table for tracking back-office connections
CREATE TABLE public.admin_login_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ip_address TEXT,
    country TEXT,
    city TEXT,
    region TEXT,
    browser TEXT,
    os TEXT,
    device_type TEXT,
    user_agent TEXT,
    is_suspicious BOOLEAN DEFAULT false,
    suspicious_reason TEXT,
    session_id TEXT
);

-- Index for fast lookups
CREATE INDEX idx_admin_login_history_user_id ON public.admin_login_history(user_id);
CREATE INDEX idx_admin_login_history_created_at ON public.admin_login_history(created_at DESC);
CREATE INDEX idx_admin_login_history_suspicious ON public.admin_login_history(is_suspicious) WHERE is_suspicious = true;

-- Enable RLS
ALTER TABLE public.admin_login_history ENABLE ROW LEVEL SECURITY;

-- Only platform admins can view login history
CREATE POLICY "Platform admins can view login history"
ON public.admin_login_history
FOR SELECT
USING (
    public.is_platform_admin(auth.uid()) OR
    public.is_platform_super_admin(auth.uid())
);

-- Service role can insert (from edge function)
CREATE POLICY "Service role can insert login history"
ON public.admin_login_history
FOR INSERT
WITH CHECK (true);

-- Add comment
COMMENT ON TABLE public.admin_login_history IS 'Tracks login attempts to the admin back-office with geolocation and device info';