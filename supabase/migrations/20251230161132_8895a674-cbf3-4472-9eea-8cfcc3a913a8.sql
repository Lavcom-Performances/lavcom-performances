-- Create table for cron alert settings
CREATE TABLE public.cron_alert_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name text NOT NULL DEFAULT 'compute-analytics-cron',
  failure_threshold integer NOT NULL DEFAULT 3,
  alert_cooldown_minutes integer NOT NULL DEFAULT 60,
  email_enabled boolean NOT NULL DEFAULT true,
  slack_enabled boolean NOT NULL DEFAULT true,
  last_alert_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(job_name)
);

-- Enable RLS
ALTER TABLE public.cron_alert_settings ENABLE ROW LEVEL SECURITY;

-- Service role can manage settings (for edge functions)
CREATE POLICY "Service role can manage cron alert settings"
ON public.cron_alert_settings
FOR ALL
USING (true)
WITH CHECK (true);

-- Insert default settings
INSERT INTO public.cron_alert_settings (job_name, failure_threshold, alert_cooldown_minutes)
VALUES ('compute-analytics-cron', 3, 60);

-- Create trigger for updated_at
CREATE TRIGGER update_cron_alert_settings_updated_at
BEFORE UPDATE ON public.cron_alert_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();