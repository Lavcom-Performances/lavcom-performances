-- =====================================================
-- TAEX-230: Action-Based MFA Enforcement
-- =====================================================

-- 1. Create mfa_challenges table to track short-lived MFA verifications
CREATE TABLE public.mfa_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '15 minutes'),
  ip_hash TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add index for efficient lookups
CREATE INDEX idx_mfa_challenges_user_action ON public.mfa_challenges (user_id, action, expires_at);
CREATE INDEX idx_mfa_challenges_expires ON public.mfa_challenges (expires_at);

-- Enable RLS
ALTER TABLE public.mfa_challenges ENABLE ROW LEVEL SECURITY;

-- Users can only see their own challenges
CREATE POLICY "Users can view own MFA challenges"
ON public.mfa_challenges
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can create their own challenges
CREATE POLICY "Users can create own MFA challenges"
ON public.mfa_challenges
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can update their own challenges (for verification)
CREATE POLICY "Users can update own MFA challenges"
ON public.mfa_challenges
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- 2. Create function to check for valid MFA session
CREATE OR REPLACE FUNCTION public.has_valid_mfa_session(
  p_user_id UUID,
  p_action TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.mfa_challenges
    WHERE user_id = p_user_id
      AND action = p_action
      AND verified_at IS NOT NULL
      AND expires_at > now()
  )
$$;

-- 3. Create function to clean up expired challenges
CREATE OR REPLACE FUNCTION public.cleanup_expired_mfa_challenges()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.mfa_challenges 
  WHERE expires_at < now() - interval '1 hour';
END;
$$;

-- 4. Create function to record MFA challenge for audit
CREATE OR REPLACE FUNCTION public.rpc_record_mfa_event(
  p_event_type TEXT,
  p_action TEXT,
  p_success BOOLEAN,
  p_ip_hash TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log to system_events
  INSERT INTO public.system_events (
    env,
    source,
    severity,
    code,
    message,
    meta
  ) VALUES (
    'prod',
    'mfa',
    CASE WHEN p_success THEN 'info' ELSE 'warn' END,
    p_event_type,
    CASE 
      WHEN p_event_type = 'MFA_CHALLENGE_REQUESTED' THEN 'MFA challenge requested for action: ' || p_action
      WHEN p_event_type = 'MFA_CHALLENGE_VERIFIED' THEN 'MFA challenge verified for action: ' || p_action
      WHEN p_event_type = 'MFA_CHALLENGE_FAILED' THEN 'MFA challenge failed for action: ' || p_action
      ELSE 'MFA event: ' || p_event_type
    END,
    jsonb_build_object(
      'actor_id', auth.uid(),
      'action', p_action,
      'success', p_success,
      'ip_hash', p_ip_hash
    )
  );
  
  -- Also log to audit_logs for compliance
  INSERT INTO public.audit_logs (
    actor_id,
    action,
    target_table,
    metadata,
    ip_hash,
    user_agent
  ) VALUES (
    auth.uid(),
    p_event_type,
    'mfa_challenges',
    jsonb_build_object('sensitive_action', p_action, 'success', p_success),
    p_ip_hash,
    p_user_agent
  );
END;
$$;