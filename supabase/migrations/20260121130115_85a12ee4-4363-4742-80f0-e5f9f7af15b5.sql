-- Schedule monthly DR drill reminder for first Monday at 09:00 UTC
SELECT cron.schedule(
  'dr-drill-reminder-monthly',
  '0 9 1-7 * 1', -- Every Monday in the first 7 days of the month at 09:00 UTC
  $$
  SELECT net.http_post(
    url := 'https://betvwipgtcrhmludzgxw.supabase.co/functions/v1/dr-drill-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('supabase.service_role_key', true)
    ),
    body := jsonb_build_object('triggered_by', 'pg_cron')
  );
  $$
);