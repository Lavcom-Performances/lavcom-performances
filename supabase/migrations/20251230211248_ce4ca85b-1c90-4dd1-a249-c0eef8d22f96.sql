-- Create RPC function for retention cohorts and LTV metrics
CREATE OR REPLACE FUNCTION public.rpc_admin_retention_metrics()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  result jsonb;
BEGIN
  -- Check admin access
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  -- Log admin action
  INSERT INTO public.admin_audit_logs (admin_user_id, action, details)
  VALUES (auth.uid(), 'view_retention_metrics', '{}'::jsonb);

  SELECT jsonb_build_object(
    -- Overall LTV metrics
    'avg_subscription_duration_days', (
      SELECT COALESCE(AVG(
        CASE 
          WHEN status = 'canceled' AND subscription_start_date IS NOT NULL THEN
            EXTRACT(EPOCH FROM (COALESCE(subscription_end_date, updated_at) - subscription_start_date)) / 86400
          WHEN status = 'active' AND subscription_start_date IS NOT NULL THEN
            EXTRACT(EPOCH FROM (NOW() - subscription_start_date)) / 86400
          ELSE NULL
        END
      ), 0)
      FROM public.subscriptions
      WHERE plan_type IN ('monthly', 'annual')
    ),
    
    -- Average LTV (based on MRR and duration)
    'avg_ltv', (
      SELECT COALESCE(AVG(
        CASE 
          WHEN plan_type = 'monthly' THEN laundry_count * 29 * 
            CASE 
              WHEN status = 'canceled' THEN
                GREATEST(1, EXTRACT(EPOCH FROM (COALESCE(subscription_end_date, updated_at) - subscription_start_date)) / 86400 / 30)
              WHEN status = 'active' THEN
                GREATEST(1, EXTRACT(EPOCH FROM (NOW() - subscription_start_date)) / 86400 / 30)
              ELSE 1
            END
          WHEN plan_type = 'annual' THEN laundry_count * 290
          ELSE 0
        END
      ), 0)
      FROM public.subscriptions
      WHERE plan_type IN ('monthly', 'annual') AND subscription_start_date IS NOT NULL
    ),
    
    -- Total LTV (all time revenue from subscriptions)
    'total_ltv', (
      SELECT COALESCE(SUM(
        CASE 
          WHEN plan_type = 'monthly' THEN laundry_count * 29 * 
            GREATEST(1, EXTRACT(EPOCH FROM (
              CASE WHEN status = 'canceled' THEN COALESCE(subscription_end_date, updated_at) ELSE NOW() END 
              - subscription_start_date
            )) / 86400 / 30)
          WHEN plan_type = 'annual' THEN laundry_count * 290
          ELSE 0
        END
      ), 0)
      FROM public.subscriptions
      WHERE plan_type IN ('monthly', 'annual') AND subscription_start_date IS NOT NULL
    ),
    
    -- Monthly retention rate (active / total started this month)
    'current_retention_rate', (
      SELECT CASE 
        WHEN COUNT(*) FILTER (WHERE subscription_start_date >= date_trunc('month', CURRENT_DATE)) > 0 
        THEN ROUND(
          COUNT(*) FILTER (WHERE status = 'active' AND subscription_start_date >= date_trunc('month', CURRENT_DATE))::numeric / 
          COUNT(*) FILTER (WHERE subscription_start_date >= date_trunc('month', CURRENT_DATE))::numeric * 100, 1
        )
        ELSE 100
      END
      FROM public.subscriptions
      WHERE plan_type IN ('monthly', 'annual')
    ),
    
    -- Overall retention rate
    'overall_retention_rate', (
      SELECT CASE 
        WHEN COUNT(*) > 0 
        THEN ROUND(COUNT(*) FILTER (WHERE status = 'active')::numeric / COUNT(*)::numeric * 100, 1)
        ELSE 100
      END
      FROM public.subscriptions
      WHERE plan_type IN ('monthly', 'annual')
    ),
    
    -- Trial to paid conversion rate
    'trial_conversion_rate', (
      SELECT CASE 
        WHEN COUNT(*) > 0 
        THEN ROUND(
          COUNT(*) FILTER (WHERE plan_type IN ('monthly', 'annual') AND trial_end_date IS NOT NULL)::numeric / 
          COUNT(*)::numeric * 100, 1
        )
        ELSE 0
      END
      FROM public.subscriptions
    ),
    
    -- Cohorts (last 6 months)
    'cohorts', (
      SELECT COALESCE(jsonb_agg(cohort_data ORDER BY cohort_month DESC), '[]'::jsonb)
      FROM (
        SELECT 
          date_trunc('month', subscription_start_date)::date AS cohort_month,
          COUNT(*) AS total_started,
          COUNT(*) FILTER (WHERE status = 'active') AS still_active,
          COUNT(*) FILTER (WHERE status = 'canceled') AS churned,
          ROUND(COUNT(*) FILTER (WHERE status = 'active')::numeric / NULLIF(COUNT(*), 0) * 100, 1) AS retention_pct,
          ROUND(AVG(laundry_count)::numeric, 1) AS avg_laundries
        FROM public.subscriptions
        WHERE plan_type IN ('monthly', 'annual')
          AND subscription_start_date >= date_trunc('month', CURRENT_DATE) - interval '6 months'
          AND subscription_start_date IS NOT NULL
        GROUP BY date_trunc('month', subscription_start_date)
      ) AS cohort_data
    ),
    
    -- Monthly churn trend
    'churn_trend', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'month', month_start,
        'churned', churned_count,
        'churn_rate', churn_rate
      ) ORDER BY month_start), '[]'::jsonb)
      FROM (
        SELECT 
          date_trunc('month', updated_at)::date AS month_start,
          COUNT(*) AS churned_count,
          ROUND(
            COUNT(*)::numeric / NULLIF((
              SELECT COUNT(*) FROM public.subscriptions s2 
              WHERE s2.plan_type IN ('monthly', 'annual')
                AND s2.subscription_start_date < date_trunc('month', s.updated_at) + interval '1 month'
            ), 0) * 100, 1
          ) AS churn_rate
        FROM public.subscriptions s
        WHERE status = 'canceled' 
          AND plan_type IN ('monthly', 'annual')
          AND updated_at >= date_trunc('month', CURRENT_DATE) - interval '6 months'
        GROUP BY date_trunc('month', updated_at)
      ) t
    ),
    
    -- Retention by plan type
    'retention_by_plan', (
      SELECT jsonb_agg(jsonb_build_object(
        'plan', plan_type,
        'total', total,
        'active', active,
        'retention_pct', retention_pct
      ))
      FROM (
        SELECT 
          plan_type,
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE status = 'active') AS active,
          ROUND(COUNT(*) FILTER (WHERE status = 'active')::numeric / NULLIF(COUNT(*), 0) * 100, 1) AS retention_pct
        FROM public.subscriptions
        WHERE plan_type IN ('monthly', 'annual')
        GROUP BY plan_type
      ) t
    )
  ) INTO result;

  RETURN result;
END;
$function$;