-- Add webhook alert threshold column to cron_alert_settings
ALTER TABLE public.cron_alert_settings 
ADD COLUMN IF NOT EXISTS webhook_alert_threshold_hours integer NOT NULL DEFAULT 24;

-- Add a comment to document the column
COMMENT ON COLUMN public.cron_alert_settings.webhook_alert_threshold_hours IS 'Hours of silence before alerting about inactive Stripe webhook (default: 24h)';