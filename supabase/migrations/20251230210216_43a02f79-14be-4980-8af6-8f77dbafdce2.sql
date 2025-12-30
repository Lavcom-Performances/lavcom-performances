-- RPC function to get subscription metrics (MRR, churn, active subs)
CREATE OR REPLACE FUNCTION public.rpc_admin_subscription_metrics()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
  current_month_start date;
  previous_month_start date;
  previous_month_end date;
BEGIN
  -- Check admin access
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  -- Log admin action
  INSERT INTO public.admin_audit_logs (admin_user_id, action, details)
  VALUES (auth.uid(), 'view_subscription_metrics', '{}'::jsonb);

  -- Calculate date boundaries
  current_month_start := date_trunc('month', CURRENT_DATE)::date;
  previous_month_start := (date_trunc('month', CURRENT_DATE) - interval '1 month')::date;
  previous_month_end := (date_trunc('month', CURRENT_DATE) - interval '1 day')::date;

  -- Build subscription metrics
  SELECT jsonb_build_object(
    -- Active subscriptions count
    'active_subscriptions', (
      SELECT COUNT(*) 
      FROM public.subscriptions 
      WHERE status = 'active' AND plan_type IN ('monthly', 'annual')
    ),
    -- Trial subscriptions count
    'trial_subscriptions', (
      SELECT COUNT(*) 
      FROM public.subscriptions 
      WHERE status = 'active' AND plan_type = 'trial'
    ),
    -- Past due subscriptions
    'past_due_subscriptions', (
      SELECT COUNT(*) 
      FROM public.subscriptions 
      WHERE status = 'past_due'
    ),
    -- Canceled subscriptions
    'canceled_subscriptions', (
      SELECT COUNT(*) 
      FROM public.subscriptions 
      WHERE status = 'canceled'
    ),
    -- Monthly subscriptions
    'monthly_subscriptions', (
      SELECT COUNT(*) 
      FROM public.subscriptions 
      WHERE status = 'active' AND plan_type = 'monthly'
    ),
    -- Annual subscriptions
    'annual_subscriptions', (
      SELECT COUNT(*) 
      FROM public.subscriptions 
      WHERE status = 'active' AND plan_type = 'annual'
    ),
    -- Total laundry count for active subs
    'total_laundries_subscribed', (
      SELECT COALESCE(SUM(laundry_count), 0)
      FROM public.subscriptions 
      WHERE status = 'active' AND plan_type IN ('monthly', 'annual')
    ),
    -- MRR calculation (simplified: 29€/laverie for monthly, 290€/12/laverie for annual)
    'mrr_estimated', (
      SELECT COALESCE(
        SUM(
          CASE 
            WHEN plan_type = 'monthly' THEN laundry_count * 29
            WHEN plan_type = 'annual' THEN laundry_count * (290.0 / 12)
            ELSE 0
          END
        ), 0
      )
      FROM public.subscriptions 
      WHERE status = 'active' AND plan_type IN ('monthly', 'annual')
    ),
    -- Churn: subscriptions canceled in current month
    'churn_current_month', (
      SELECT COUNT(*)
      FROM public.subscriptions
      WHERE status = 'canceled'
        AND updated_at >= current_month_start
    ),
    -- New subscriptions this month
    'new_subscriptions_current_month', (
      SELECT COUNT(*)
      FROM public.subscriptions
      WHERE status = 'active' 
        AND plan_type IN ('monthly', 'annual')
        AND subscription_start_date >= current_month_start
    ),
    -- Conversions from trial this month
    'trial_conversions_current_month', (
      SELECT COUNT(*)
      FROM public.subscriptions
      WHERE status = 'active' 
        AND plan_type IN ('monthly', 'annual')
        AND trial_end_date IS NOT NULL
        AND subscription_start_date >= current_month_start
    ),
    -- Trials expiring in next 7 days
    'trials_expiring_soon', (
      SELECT COUNT(*)
      FROM public.subscriptions
      WHERE status = 'active' 
        AND plan_type = 'trial'
        AND trial_end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + interval '7 days'
    ),
    -- Subscription breakdown by status
    'status_breakdown', (
      SELECT jsonb_agg(jsonb_build_object('status', status, 'count', cnt))
      FROM (
        SELECT status, COUNT(*) as cnt
        FROM public.subscriptions
        GROUP BY status
        ORDER BY cnt DESC
      ) t
    ),
    -- Monthly trend (last 6 months)
    'monthly_trend', (
      SELECT jsonb_agg(jsonb_build_object(
        'month', month_start,
        'active', active_count,
        'new', new_count,
        'churned', churned_count
      ) ORDER BY month_start)
      FROM (
        SELECT 
          date_trunc('month', d)::date as month_start,
          (
            SELECT COUNT(*) 
            FROM public.subscriptions s 
            WHERE s.status = 'active' 
              AND s.plan_type IN ('monthly', 'annual')
              AND s.subscription_start_date <= date_trunc('month', d) + interval '1 month' - interval '1 day'
          ) as active_count,
          (
            SELECT COUNT(*) 
            FROM public.subscriptions s 
            WHERE s.plan_type IN ('monthly', 'annual')
              AND s.subscription_start_date >= date_trunc('month', d)
              AND s.subscription_start_date < date_trunc('month', d) + interval '1 month'
          ) as new_count,
          (
            SELECT COUNT(*) 
            FROM public.subscriptions s 
            WHERE s.status = 'canceled'
              AND s.updated_at >= date_trunc('month', d)
              AND s.updated_at < date_trunc('month', d) + interval '1 month'
          ) as churned_count
        FROM generate_series(
          date_trunc('month', CURRENT_DATE) - interval '5 months',
          date_trunc('month', CURRENT_DATE),
          interval '1 month'
        ) d
      ) t
    )
  ) INTO result;

  RETURN result;
END;
$$;