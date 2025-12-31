-- Create cleanup function for system_events (30 days retention)
CREATE OR REPLACE FUNCTION public.cleanup_old_system_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.system_events 
  WHERE created_at < now() - interval '30 days';
END;
$$;

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION public.cleanup_old_system_events() TO service_role;