-- Create cron job for weekly compliance report cleanup (Sundays 04:30 UTC)
SELECT cron.schedule(
  'cleanup-compliance-reports-weekly',
  '30 4 * * 0',
  $$
  SELECT net.http_post(
    url := 'https://betvwipgtcrhmludzgxw.supabase.co/functions/v1/cleanup-compliance-reports',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1)
    ),
    body := jsonb_build_object('retention_years', 2)
  );
  $$
);