-- 1) Rebind "Service role can manage ..." policies to service_role only
DROP POLICY IF EXISTS "Service role can manage AI usage" ON public.ai_usage_daily;
CREATE POLICY "Service role can manage AI usage"
  ON public.ai_usage_daily FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage cron alert settings" ON public.cron_alert_settings;
CREATE POLICY "Service role can manage cron alert settings"
  ON public.cron_alert_settings FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage cron logs" ON public.cron_logs;
CREATE POLICY "Service role can manage cron logs"
  ON public.cron_logs FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage expert requests" ON public.expert_requests;
CREATE POLICY "Service role can manage expert requests"
  ON public.expert_requests FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage fin_workspaces" ON public.fin_workspaces;
CREATE POLICY "Service role can manage fin_workspaces"
  ON public.fin_workspaces FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage impersonation sessions" ON public.impersonation_sessions;
CREATE POLICY "Service role can manage impersonation sessions"
  ON public.impersonation_sessions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can read feature flags" ON public.platform_feature_flags;
CREATE POLICY "Service role can read feature flags"
  ON public.platform_feature_flags FOR SELECT TO service_role
  USING (true);

DROP POLICY IF EXISTS "Service role can manage stripe events" ON public.stripe_events;
CREATE POLICY "Service role can manage stripe events"
  ON public.stripe_events FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 2) Privilege escalation fix: prevent self-assigning admin roles
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;
CREATE POLICY "Users can insert their own role"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND role IN ('user'::app_role, 'guest'::app_role, 'checker'::app_role)
  );

-- 3) Realtime data leak: remove sensitive admin tables from realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.admin_login_history;
ALTER PUBLICATION supabase_realtime DROP TABLE public.audit_logs;