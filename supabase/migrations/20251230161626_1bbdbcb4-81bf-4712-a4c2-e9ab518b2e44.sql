-- Add severity-based thresholds to cron_alert_settings
ALTER TABLE public.cron_alert_settings 
ADD COLUMN warning_threshold integer NOT NULL DEFAULT 3,
ADD COLUMN critical_threshold integer NOT NULL DEFAULT 5;

-- Migrate existing data: copy failure_threshold to warning_threshold
UPDATE public.cron_alert_settings 
SET warning_threshold = failure_threshold,
    critical_threshold = failure_threshold + 2;

-- Add column to track last severity sent to avoid duplicate alerts
ALTER TABLE public.cron_alert_settings 
ADD COLUMN last_alert_severity text;