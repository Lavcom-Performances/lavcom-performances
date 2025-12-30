-- Create table for churn alert settings
CREATE TABLE IF NOT EXISTS public.churn_alert_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  churn_threshold integer NOT NULL DEFAULT 5,
  email_enabled boolean NOT NULL DEFAULT true,
  recipient_emails text[] NOT NULL DEFAULT '{}',
  last_alert_at timestamp with time zone,
  alert_cooldown_hours integer NOT NULL DEFAULT 24,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.churn_alert_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage churn alert settings
CREATE POLICY "Admins can manage churn alert settings"
  ON public.churn_alert_settings
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Create trigger for updated_at
CREATE TRIGGER update_churn_alert_settings_updated_at
  BEFORE UPDATE ON public.churn_alert_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();