-- Create table for alert history
CREATE TABLE public.alert_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_type text NOT NULL CHECK (alert_type IN ('cron', 'webhook', 'churn', 'system')),
  severity text NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  title text NOT NULL,
  message text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  recipient text,
  channel text NOT NULL CHECK (channel IN ('email', 'slack', 'webhook')),
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.alert_history ENABLE ROW LEVEL SECURITY;

-- Only admins can view alert history
CREATE POLICY "Admins can view alert history"
  ON public.alert_history
  FOR SELECT
  USING (is_admin());

-- Service role can insert alert history
CREATE POLICY "Service role can insert alert history"
  ON public.alert_history
  FOR INSERT
  WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_alert_history_sent_at ON public.alert_history(sent_at DESC);
CREATE INDEX idx_alert_history_type ON public.alert_history(alert_type);
CREATE INDEX idx_alert_history_severity ON public.alert_history(severity);