-- =============================================================================
-- TAEX-233: Account Recovery & High-Risk Login Protections
-- =============================================================================

-- Table: auth_login_events - Store login events with device fingerprinting
CREATE TABLE public.auth_login_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  user_agent_hash TEXT,
  ip_hash TEXT,
  country TEXT,
  timezone TEXT,
  locale TEXT,
  risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high')),
  risk_reasons TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for auth_login_events
CREATE INDEX idx_auth_login_events_user_id ON public.auth_login_events(user_id);
CREATE INDEX idx_auth_login_events_device_id ON public.auth_login_events(user_id, device_id);
CREATE INDEX idx_auth_login_events_created_at ON public.auth_login_events(created_at);

-- RLS for auth_login_events
ALTER TABLE public.auth_login_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own login events"
ON public.auth_login_events FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Platform admins can read all login events"
ON public.auth_login_events FOR SELECT
TO authenticated
USING (public.is_platform_admin(auth.uid()));

-- Table: auth_login_otps - Store email OTP codes
CREATE TABLE public.auth_login_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INT DEFAULT 0,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for auth_login_otps
CREATE INDEX idx_auth_login_otps_user_device ON public.auth_login_otps(user_id, device_id);
CREATE INDEX idx_auth_login_otps_expires ON public.auth_login_otps(expires_at);

-- RLS for auth_login_otps (only via edge functions)
ALTER TABLE public.auth_login_otps ENABLE ROW LEVEL SECURITY;

-- Table: trusted_devices - Store trusted device/user combinations
CREATE TABLE public.trusted_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  device_name TEXT,
  trusted_until TIMESTAMPTZ NOT NULL,
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, device_id)
);

-- Indexes for trusted_devices
CREATE INDEX idx_trusted_devices_user_id ON public.trusted_devices(user_id);
CREATE INDEX idx_trusted_devices_expires ON public.trusted_devices(trusted_until);

-- RLS for trusted_devices
ALTER TABLE public.trusted_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own trusted devices"
ON public.trusted_devices FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trusted devices"
ON public.trusted_devices FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Table: recovery_codes - Store hashed recovery codes
CREATE TABLE public.recovery_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for recovery_codes
CREATE INDEX idx_recovery_codes_user_id ON public.recovery_codes(user_id);

-- RLS for recovery_codes
ALTER TABLE public.recovery_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own recovery codes metadata"
ON public.recovery_codes FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Helper function: Check if device is trusted for user
CREATE OR REPLACE FUNCTION public.is_device_trusted(p_user_id UUID, p_device_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.trusted_devices
    WHERE user_id = p_user_id
      AND device_id = p_device_id
      AND trusted_until > now()
  )
$$;

-- Helper function: Check if device was seen recently (90 days)
CREATE OR REPLACE FUNCTION public.was_device_seen_recently(p_user_id UUID, p_device_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.auth_login_events
    WHERE user_id = p_user_id
      AND device_id = p_device_id
      AND created_at > now() - interval '90 days'
  )
$$;

-- Helper function: Get last login country for user
CREATE OR REPLACE FUNCTION public.get_last_login_country(p_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT country
  FROM public.auth_login_events
  WHERE user_id = p_user_id
    AND country IS NOT NULL
  ORDER BY created_at DESC
  LIMIT 1
$$;

-- Helper function: Count recovery codes remaining
CREATE OR REPLACE FUNCTION public.count_recovery_codes(p_user_id UUID)
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM public.recovery_codes
  WHERE user_id = p_user_id
    AND used_at IS NULL
$$;

-- Cleanup function for expired OTPs
CREATE OR REPLACE FUNCTION public.cleanup_expired_login_otps()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.auth_login_otps 
  WHERE expires_at < now() - interval '1 hour';
END;
$$;

-- Cleanup function for expired trusted devices
CREATE OR REPLACE FUNCTION public.cleanup_expired_trusted_devices()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.trusted_devices 
  WHERE trusted_until < now();
END;
$$;