-- RPC to get last Stripe event for webhook status check
CREATE OR REPLACE FUNCTION public.rpc_stripe_last_event()
RETURNS TABLE (event_type text, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT event_type, created_at
  FROM public.stripe_events
  ORDER BY created_at DESC
  LIMIT 1;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.rpc_stripe_last_event() TO authenticated;