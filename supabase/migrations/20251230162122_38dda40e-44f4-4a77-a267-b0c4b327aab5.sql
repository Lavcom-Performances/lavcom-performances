-- Function is_admin() - checks if current user is super_admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'super_admin'
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Audit logs table for admin actions
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  action text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
ON public.admin_audit_logs FOR SELECT
USING (public.is_admin());

-- Service role can insert (via RPC)
CREATE POLICY "Service can insert audit logs"
ON public.admin_audit_logs FOR INSERT
WITH CHECK (true);

-- RPC: Get global admin stats (users, sites count, distribution)
CREATE OR REPLACE FUNCTION public.rpc_admin_global_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  audit_id uuid;
BEGIN
  -- Check admin access
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  -- Log admin action
  INSERT INTO public.admin_audit_logs (admin_user_id, action, details)
  VALUES (auth.uid(), 'view_global_stats', '{}'::jsonb)
  RETURNING id INTO audit_id;

  -- Build stats
  SELECT jsonb_build_object(
    'total_users', (SELECT COUNT(DISTINCT id) FROM public.profiles),
    'total_sites', (SELECT COUNT(*) FROM public.sites WHERE is_demo = false),
    'total_demo_sites', (SELECT COUNT(*) FROM public.sites WHERE is_demo = true),
    'cities_distribution', (
      SELECT jsonb_agg(jsonb_build_object('city', city, 'count', cnt))
      FROM (
        SELECT COALESCE(city, 'Non renseigné') as city, COUNT(*) as cnt
        FROM public.sites
        WHERE is_demo = false
        GROUP BY city
        ORDER BY cnt DESC
        LIMIT 10
      ) t
    ),
    'active_subscriptions', (
      SELECT COUNT(*) FROM public.subscriptions 
      WHERE status = 'active'
    ),
    'trial_subscriptions', (
      SELECT COUNT(*) FROM public.subscriptions 
      WHERE plan_type = 'trial' AND status = 'active'
    )
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_global_stats() TO authenticated;

-- RPC: Get global revenue stats for a period
CREATE OR REPLACE FUNCTION public.rpc_admin_revenue_stats(
  p_start_date date,
  p_end_date date
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Check admin access
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  -- Log admin action
  INSERT INTO public.admin_audit_logs (admin_user_id, action, details)
  VALUES (auth.uid(), 'view_revenue_stats', jsonb_build_object(
    'start_date', p_start_date,
    'end_date', p_end_date
  ));

  -- Build revenue stats (aggregates only, no raw data)
  SELECT jsonb_build_object(
    'total_revenue', COALESCE(SUM(COALESCE(price_cb, 0) + COALESCE(price_esp, 0)), 0),
    'total_transactions', COUNT(*),
    'revenue_cb', COALESCE(SUM(COALESCE(price_cb, 0)), 0),
    'revenue_esp', COALESCE(SUM(COALESCE(price_esp, 0)), 0),
    'active_sites', COUNT(DISTINCT site_id),
    'avg_basket', CASE 
      WHEN COUNT(*) > 0 THEN ROUND(SUM(COALESCE(price_cb, 0) + COALESCE(price_esp, 0)) / COUNT(*), 2)
      ELSE 0
    END
  )
  FROM public.operations
  WHERE operation_date BETWEEN p_start_date AND p_end_date
  INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_revenue_stats(date, date) TO authenticated;

-- RPC: Get top sites by revenue (anonymized)
CREATE OR REPLACE FUNCTION public.rpc_admin_top_sites(
  p_start_date date,
  p_end_date date,
  p_limit int DEFAULT 10
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Check admin access
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  -- Log admin action
  INSERT INTO public.admin_audit_logs (admin_user_id, action, details)
  VALUES (auth.uid(), 'view_top_sites', jsonb_build_object(
    'start_date', p_start_date,
    'end_date', p_end_date,
    'limit', p_limit
  ));

  -- Get top sites (city only, no owner info)
  SELECT jsonb_agg(jsonb_build_object(
    'city', t.city,
    'revenue', t.revenue,
    'transactions', t.transactions
  ))
  FROM (
    SELECT 
      COALESCE(s.city, 'Non renseigné') as city,
      SUM(COALESCE(o.price_cb, 0) + COALESCE(o.price_esp, 0)) as revenue,
      COUNT(*) as transactions
    FROM public.operations o
    JOIN public.sites s ON s.id = o.site_id
    WHERE o.operation_date BETWEEN p_start_date AND p_end_date
      AND s.is_demo = false
    GROUP BY s.id, s.city
    ORDER BY revenue DESC
    LIMIT p_limit
  ) t
  INTO result;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_top_sites(date, date, int) TO authenticated;

-- RPC: Get monthly revenue time series
CREATE OR REPLACE FUNCTION public.rpc_admin_monthly_series(
  p_start_date date,
  p_end_date date
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Check admin access
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  -- Log admin action
  INSERT INTO public.admin_audit_logs (admin_user_id, action, details)
  VALUES (auth.uid(), 'view_monthly_series', jsonb_build_object(
    'start_date', p_start_date,
    'end_date', p_end_date
  ));

  -- Get monthly aggregates
  SELECT jsonb_agg(jsonb_build_object(
    'year', t.year,
    'month', t.month,
    'revenue', t.revenue,
    'transactions', t.transactions,
    'active_sites', t.active_sites
  ) ORDER BY t.year, t.month)
  FROM (
    SELECT 
      EXTRACT(YEAR FROM o.operation_date)::int as year,
      EXTRACT(MONTH FROM o.operation_date)::int as month,
      SUM(COALESCE(o.price_cb, 0) + COALESCE(o.price_esp, 0)) as revenue,
      COUNT(*) as transactions,
      COUNT(DISTINCT o.site_id) as active_sites
    FROM public.operations o
    JOIN public.sites s ON s.id = o.site_id
    WHERE o.operation_date BETWEEN p_start_date AND p_end_date
      AND s.is_demo = false
    GROUP BY 1, 2
  ) t
  INTO result;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_monthly_series(date, date) TO authenticated;