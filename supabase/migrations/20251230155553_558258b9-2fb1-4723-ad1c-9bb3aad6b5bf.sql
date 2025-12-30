-- Create a secure function to call the cron endpoint with the secret
-- This function will be called by pg_cron and uses the service role to access vault
CREATE OR REPLACE FUNCTION public.trigger_compute_analytics_cron()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  cron_secret text;
  supabase_url text := 'https://betvwipgtcrhmludzgxw.supabase.co';
BEGIN
  -- Get the CRON_SECRET from vault
  SELECT decrypted_secret INTO cron_secret
  FROM vault.decrypted_secrets
  WHERE name = 'CRON_SECRET'
  LIMIT 1;

  -- If no secret found, log and exit
  IF cron_secret IS NULL THEN
    RAISE WARNING 'CRON_SECRET not found in vault';
    RETURN;
  END IF;

  -- Make HTTP POST request to the edge function
  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/compute-analytics-cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', cron_secret
    ),
    body := jsonb_build_object(
      'triggered_by', 'pg_cron',
      'scheduled_at', now()::text
    )
  );
END;
$$;