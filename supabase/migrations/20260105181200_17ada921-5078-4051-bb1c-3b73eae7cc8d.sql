-- Fix EXPOSED_SENSITIVE_DATA: Enable RLS on cron_alert_settings and cron_logs
-- These tables should only be accessible by administrators

-- 1. Enable RLS on cron_alert_settings
ALTER TABLE public.cron_alert_settings ENABLE ROW LEVEL SECURITY;

-- Create admin-only policies for cron_alert_settings
CREATE POLICY "Only admins can view cron_alert_settings"
  ON public.cron_alert_settings
  FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Only admins can insert cron_alert_settings"
  ON public.cron_alert_settings
  FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can update cron_alert_settings"
  ON public.cron_alert_settings
  FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Only admins can delete cron_alert_settings"
  ON public.cron_alert_settings
  FOR DELETE
  USING (public.is_admin());

-- 2. Enable RLS on cron_logs
ALTER TABLE public.cron_logs ENABLE ROW LEVEL SECURITY;

-- Create admin-only policies for cron_logs
CREATE POLICY "Only admins can view cron_logs"
  ON public.cron_logs
  FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Only admins can insert cron_logs"
  ON public.cron_logs
  FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can update cron_logs"
  ON public.cron_logs
  FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Only admins can delete cron_logs"
  ON public.cron_logs
  FOR DELETE
  USING (public.is_admin());