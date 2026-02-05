-- TAEX-302: Beta Go-Live Hardening & Monitoring
-- Database schema for beta operations management

-- 1. Create beta_company_overrides table for safe manual controls
CREATE TABLE public.beta_company_overrides (
  company_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  recommendations_suppressed boolean NOT NULL DEFAULT false,
  suppressed_reason text,
  suppressed_at timestamptz,
  suppressed_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.beta_company_overrides ENABLE ROW LEVEL SECURITY;

-- RLS: Platform Admin only
CREATE POLICY "Platform admins can manage beta overrides"
  ON public.beta_company_overrides
  FOR ALL
  USING (public.is_platform_admin(auth.uid()));

-- Updated_at trigger
CREATE TRIGGER update_beta_company_overrides_updated_at
  BEFORE UPDATE ON public.beta_company_overrides
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Create RPC for billing verification check
CREATE OR REPLACE FUNCTION public.rpc_beta_billing_check()
RETURNS TABLE (
  company_id uuid,
  company_name text,
  beta_started_at timestamptz,
  beta_ends_at timestamptz,
  effective_price_cents integer,
  active_laundromats_count bigint,
  estimated_monthly_amount bigint,
  warnings jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify platform admin
  IF NOT is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  WITH beta_orgs AS (
    SELECT 
      o.id,
      o.name,
      o.beta_started_at,
      o.beta_ends_at,
      o.is_beta,
      public.rpc_effective_price_per_laundromat(o.id) as eff_price
    FROM public.organizations o
    WHERE o.is_beta = true
  ),
  site_counts AS (
    SELECT 
      s.user_id,
      COUNT(*) FILTER (WHERE s.is_active = true) as active_count
    FROM public.sites s
    WHERE NOT s.is_demo
    GROUP BY s.user_id
  ),
  user_orgs AS (
    SELECT DISTINCT ON (ur.organization_id)
      ur.organization_id,
      ur.user_id
    FROM public.user_roles ur
  ),
  dts_recent AS (
    SELECT 
      td.site_id,
      AVG(td.dts_score) as avg_dts_2d
    FROM public.trust_day td
    WHERE td.day >= CURRENT_DATE - INTERVAL '2 days'
    GROUP BY td.site_id
  ),
  org_dts AS (
    SELECT 
      uo.organization_id,
      MIN(dr.avg_dts_2d) as min_dts
    FROM user_orgs uo
    JOIN public.sites s ON s.user_id = uo.user_id AND NOT s.is_demo
    LEFT JOIN dts_recent dr ON dr.site_id = s.id
    GROUP BY uo.organization_id
  )
  SELECT 
    bo.id as company_id,
    bo.name as company_name,
    bo.beta_started_at,
    bo.beta_ends_at,
    bo.eff_price as effective_price_cents,
    COALESCE(sc.active_count, 0) as active_laundromats_count,
    COALESCE(sc.active_count, 0) * bo.eff_price as estimated_monthly_amount,
    jsonb_build_object(
      'beta_ends_at_null', bo.beta_ends_at IS NULL,
      'no_active_laundromats', COALESCE(sc.active_count, 0) = 0,
      'low_dts', COALESCE(od.min_dts, 100) < 40
    ) as warnings
  FROM beta_orgs bo
  LEFT JOIN user_orgs uo ON uo.organization_id = bo.id
  LEFT JOIN site_counts sc ON sc.user_id = uo.user_id
  LEFT JOIN org_dts od ON od.organization_id = bo.id
  ORDER BY bo.name;
END;
$$;

-- 3. Create RPC for beta ops overview (week-1 monitoring)
CREATE OR REPLACE FUNCTION public.rpc_beta_ops_overview()
RETURNS TABLE (
  company_id uuid,
  company_name text,
  last_activity timestamptz,
  dts_avg_7d numeric,
  import_flag_rate numeric,
  export_failures_7d integer,
  feedback_count_7d integer,
  days_since_activity integer,
  recommendations_suppressed boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  WITH beta_orgs AS (
    SELECT o.id, o.name
    FROM public.organizations o
    WHERE o.is_beta = true
  ),
  user_orgs AS (
    SELECT DISTINCT ON (ur.organization_id)
      ur.organization_id,
      ur.user_id
    FROM public.user_roles ur
  ),
  -- Last activity from system_events
  last_activities AS (
    SELECT 
      (se.meta->>'company_id')::uuid as org_id,
      MAX(se.created_at) as last_act
    FROM public.system_events se
    WHERE se.meta->>'company_id' IS NOT NULL
      AND se.created_at >= now() - INTERVAL '30 days'
    GROUP BY (se.meta->>'company_id')::uuid
  ),
  -- DTS average over 7 days
  dts_scores AS (
    SELECT 
      uo.organization_id,
      AVG(td.dts_score) as avg_score
    FROM user_orgs uo
    JOIN public.sites s ON s.user_id = uo.user_id AND NOT s.is_demo
    JOIN public.trust_day td ON td.site_id = s.id
    WHERE td.day >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY uo.organization_id
  ),
  -- Import flag rates
  import_flags AS (
    SELECT 
      uo.organization_id,
      AVG(ti.invalid_rate) as flag_rate
    FROM user_orgs uo
    JOIN public.sites s ON s.user_id = uo.user_id AND NOT s.is_demo
    JOIN public.trust_import ti ON ti.site_id = s.id
    WHERE ti.computed_at >= now() - INTERVAL '7 days'
    GROUP BY uo.organization_id
  ),
  -- Export failures
  export_fails AS (
    SELECT 
      (se.meta->>'company_id')::uuid as org_id,
      COUNT(*) as fail_count
    FROM public.system_events se
    WHERE se.code = 'export_failed'
      AND se.created_at >= now() - INTERVAL '7 days'
      AND se.meta->>'company_id' IS NOT NULL
    GROUP BY (se.meta->>'company_id')::uuid
  ),
  -- Feedback count
  feedback_counts AS (
    SELECT 
      (se.meta->>'company_id')::uuid as org_id,
      COUNT(*) as fb_count
    FROM public.system_events se
    WHERE se.source = 'beta_feedback'
      AND se.created_at >= now() - INTERVAL '7 days'
      AND se.meta->>'company_id' IS NOT NULL
    GROUP BY (se.meta->>'company_id')::uuid
  ),
  -- Overrides
  overrides AS (
    SELECT company_id, recommendations_suppressed
    FROM public.beta_company_overrides
  )
  SELECT 
    bo.id as company_id,
    bo.name as company_name,
    la.last_act as last_activity,
    ROUND(COALESCE(ds.avg_score, 0)::numeric, 1) as dts_avg_7d,
    ROUND(COALESCE(if.flag_rate, 0)::numeric, 1) as import_flag_rate,
    COALESCE(ef.fail_count, 0)::integer as export_failures_7d,
    COALESCE(fc.fb_count, 0)::integer as feedback_count_7d,
    CASE 
      WHEN la.last_act IS NULL THEN 999
      ELSE EXTRACT(DAY FROM now() - la.last_act)::integer
    END as days_since_activity,
    COALESCE(ov.recommendations_suppressed, false) as recommendations_suppressed
  FROM beta_orgs bo
  LEFT JOIN last_activities la ON la.org_id = bo.id
  LEFT JOIN dts_scores ds ON ds.organization_id = bo.id
  LEFT JOIN import_flags if ON if.organization_id = bo.id
  LEFT JOIN export_fails ef ON ef.org_id = bo.id
  LEFT JOIN feedback_counts fc ON fc.org_id = bo.id
  LEFT JOIN overrides ov ON ov.company_id = bo.id
  ORDER BY bo.name;
END;
$$;

-- 4. Create RPC to get beta alerts
CREATE OR REPLACE FUNCTION public.rpc_beta_ops_alerts()
RETURNS TABLE (
  company_id uuid,
  company_name text,
  alert_type text,
  alert_reason text,
  severity text,
  detected_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  WITH overview AS (
    SELECT * FROM public.rpc_beta_ops_overview()
  )
  -- Low DTS alerts
  SELECT 
    o.company_id,
    o.company_name,
    'low_dts'::text as alert_type,
    'DTS score below 60 for last day'::text as alert_reason,
    'warn'::text as severity,
    now() as detected_at
  FROM overview o
  WHERE o.dts_avg_7d < 60 AND o.dts_avg_7d > 0
  
  UNION ALL
  
  -- High import flag rate
  SELECT 
    o.company_id,
    o.company_name,
    'high_import_flags'::text,
    format('Import flag rate: %.1f%%', o.import_flag_rate),
    'warn'::text,
    now()
  FROM overview o
  WHERE o.import_flag_rate > 20
  
  UNION ALL
  
  -- Export failures
  SELECT 
    o.company_id,
    o.company_name,
    'export_failures'::text,
    format('%s export failures in last 7 days', o.export_failures_7d),
    CASE WHEN o.export_failures_7d > 5 THEN 'error' ELSE 'warn' END::text,
    now()
  FROM overview o
  WHERE o.export_failures_7d >= 3
  
  UNION ALL
  
  -- Inactivity
  SELECT 
    o.company_id,
    o.company_name,
    'inactivity'::text,
    format('No activity for %s days', o.days_since_activity),
    CASE WHEN o.days_since_activity > 7 THEN 'error' ELSE 'warn' END::text,
    now()
  FROM overview o
  WHERE o.days_since_activity >= 3
  
  ORDER BY severity DESC, company_name;
END;
$$;

-- 5. Create RPC to recalculate latest DTS for a company
CREATE OR REPLACE FUNCTION public.rpc_recalc_latest_dts(p_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_site_id uuid;
  v_import_id uuid;
  v_result jsonb;
  v_count integer := 0;
BEGIN
  IF NOT is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Find sites for this company via user_roles
  FOR v_site_id IN
    SELECT s.id
    FROM public.user_roles ur
    JOIN public.sites s ON s.user_id = ur.user_id AND NOT s.is_demo
    WHERE ur.organization_id = p_company_id
  LOOP
    -- Get latest import for this site
    SELECT ti.import_id INTO v_import_id
    FROM public.trust_import ti
    WHERE ti.site_id = v_site_id
    ORDER BY ti.computed_at DESC
    LIMIT 1;

    IF v_import_id IS NOT NULL THEN
      -- Re-compute DTS (call the existing function)
      PERFORM public.compute_dts_for_import(v_site_id, v_import_id);
      v_count := v_count + 1;
    END IF;
  END LOOP;

  -- Log to system_events
  INSERT INTO public.system_events (env, source, severity, code, message, meta)
  VALUES (
    'prod',
    'beta_ops',
    'info',
    'beta_ops_recalc_dts',
    format('Recalculated DTS for company %s', p_company_id),
    jsonb_build_object(
      'company_id', p_company_id,
      'actor_user_id', auth.uid(),
      'sites_processed', v_count
    )
  );

  RETURN jsonb_build_object('success', true, 'sites_processed', v_count);
END;
$$;

-- 6. Create RPC to toggle recommendations suppression
CREATE OR REPLACE FUNCTION public.rpc_toggle_recommendations_suppression(
  p_company_id uuid,
  p_suppressed boolean,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Upsert the override
  INSERT INTO public.beta_company_overrides (
    company_id,
    recommendations_suppressed,
    suppressed_reason,
    suppressed_at,
    suppressed_by
  )
  VALUES (
    p_company_id,
    p_suppressed,
    CASE WHEN p_suppressed THEN p_reason ELSE NULL END,
    CASE WHEN p_suppressed THEN now() ELSE NULL END,
    CASE WHEN p_suppressed THEN auth.uid() ELSE NULL END
  )
  ON CONFLICT (company_id) DO UPDATE SET
    recommendations_suppressed = p_suppressed,
    suppressed_reason = CASE WHEN p_suppressed THEN p_reason ELSE NULL END,
    suppressed_at = CASE WHEN p_suppressed THEN now() ELSE NULL END,
    suppressed_by = CASE WHEN p_suppressed THEN auth.uid() ELSE NULL END,
    updated_at = now();

  -- Log to system_events
  INSERT INTO public.system_events (env, source, severity, code, message, meta)
  VALUES (
    'prod',
    'beta_ops',
    'warn',
    CASE WHEN p_suppressed THEN 'beta_ops_suppress_reco' ELSE 'beta_ops_unsuppress_reco' END,
    format('%s recommendations for company %s', 
      CASE WHEN p_suppressed THEN 'Suppressed' ELSE 'Unsuppressed' END,
      p_company_id
    ),
    jsonb_build_object(
      'company_id', p_company_id,
      'actor_user_id', auth.uid(),
      'suppressed', p_suppressed,
      'reason', p_reason
    )
  );

  RETURN jsonb_build_object('success', true, 'suppressed', p_suppressed);
END;
$$;

-- 7. Create RPC to log beta contact
CREATE OR REPLACE FUNCTION public.rpc_log_beta_contact(
  p_company_id uuid,
  p_channel text,
  p_notes text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Log to system_events
  INSERT INTO public.system_events (env, source, severity, code, message, meta)
  VALUES (
    'prod',
    'beta_ops',
    'info',
    'beta_ops_contact_logged',
    format('Contact logged for company %s via %s', p_company_id, p_channel),
    jsonb_build_object(
      'company_id', p_company_id,
      'actor_user_id', auth.uid(),
      'channel', p_channel,
      'notes', p_notes
    )
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 8. Create RPC to get beta actions log
CREATE OR REPLACE FUNCTION public.rpc_beta_ops_actions_log(p_limit integer DEFAULT 50)
RETURNS TABLE (
  id bigint,
  company_id uuid,
  actor_user_id uuid,
  action_type text,
  message text,
  meta jsonb,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT 
    se.id,
    (se.meta->>'company_id')::uuid,
    (se.meta->>'actor_user_id')::uuid,
    se.code,
    se.message,
    se.meta,
    se.created_at
  FROM public.system_events se
  WHERE se.source = 'beta_ops'
  ORDER BY se.created_at DESC
  LIMIT p_limit;
END;
$$;

-- 9. Check if recommendations are suppressed for a company (for SaaS use)
CREATE OR REPLACE FUNCTION public.rpc_is_recommendations_suppressed(p_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT recommendations_suppressed FROM public.beta_company_overrides WHERE company_id = p_organization_id),
    false
  );
$$;

-- 10. Log billing check view event
CREATE OR REPLACE FUNCTION public.rpc_log_billing_check_view()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_platform_admin(auth.uid()) THEN
    RETURN; -- Silent fail for non-admins
  END IF;

  INSERT INTO public.system_events (env, source, severity, code, message, meta)
  VALUES (
    'prod',
    'beta_ops',
    'info',
    'beta_billing_check_viewed',
    'Billing check page viewed',
    jsonb_build_object('actor_user_id', auth.uid())
  );
END;
$$;