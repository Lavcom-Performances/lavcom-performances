-- Update rpc_run_smoke_tests to add T6: Analytics consistency check
CREATE OR REPLACE FUNCTION public.rpc_run_smoke_tests(p_site_id uuid)
RETURNS TABLE (
  test_key text,
  ok boolean,
  details text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ops_count bigint;
  cal_count int;
  kpis record;
  month_count int;
  rec_count int;
  v_test_key text;
  v_ok boolean;
  v_details text;
  -- T6 variables
  ops_revenue numeric;
  analytics_revenue numeric;
  revenue_diff numeric;
BEGIN
  -- Admin check
  IF NOT public.is_admin() THEN 
    RAISE EXCEPTION 'forbidden'; 
  END IF;

  -- T1: Operations exist for site
  SELECT COUNT(*) INTO ops_count 
  FROM public.operations 
  WHERE site_id = p_site_id;
  
  v_test_key := 'T1_ops_exist';
  v_ok := (ops_count > 0);
  v_details := 'ops_count=' || ops_count;
  RETURN QUERY SELECT v_test_key, v_ok, v_details;

  -- T2: Calendar KPIs returns 3 rows (day/month/year)
  BEGIN
    SELECT COUNT(*) INTO cal_count 
    FROM public.rpc_operations_calendar_kpis(p_site_id);
    
    v_test_key := 'T2_calendar_kpis';
    v_ok := (cal_count = 3);
    v_details := 'rows=' || cal_count;
    RETURN QUERY SELECT v_test_key, v_ok, v_details;
  EXCEPTION WHEN OTHERS THEN
    v_test_key := 'T2_calendar_kpis';
    v_ok := false;
    v_details := 'error=' || SQLERRM;
    RETURN QUERY SELECT v_test_key, v_ok, v_details;
  END;

  -- T3: Dashboard KPIs returns valid data
  BEGIN
    SELECT * INTO kpis 
    FROM public.rpc_dashboard_kpis(
      p_site_id,
      (NOW() AT TIME ZONE 'Europe/Paris')::date - 30,
      (NOW() AT TIME ZONE 'Europe/Paris')::date
    );
    
    v_test_key := 'T3_dashboard_kpis';
    v_ok := true;
    v_details := 'total_revenue=' || COALESCE(kpis.total_revenue::text, 'null');
    RETURN QUERY SELECT v_test_key, v_ok, v_details;
  EXCEPTION WHEN OTHERS THEN
    v_test_key := 'T3_dashboard_kpis';
    v_ok := false;
    v_details := 'error=' || SQLERRM;
    RETURN QUERY SELECT v_test_key, v_ok, v_details;
  END;

  -- T4: Monthly revenue returns data for current year
  BEGIN
    SELECT COUNT(*) INTO month_count 
    FROM public.rpc_monthly_revenue(
      p_site_id,
      EXTRACT(YEAR FROM (NOW() AT TIME ZONE 'Europe/Paris')::date)::int
    );
    
    v_test_key := 'T4_monthly_revenue';
    v_ok := (month_count >= 0);
    v_details := 'rows=' || month_count;
    RETURN QUERY SELECT v_test_key, v_ok, v_details;
  EXCEPTION WHEN OTHERS THEN
    v_test_key := 'T4_monthly_revenue';
    v_ok := false;
    v_details := 'error=' || SQLERRM;
    RETURN QUERY SELECT v_test_key, v_ok, v_details;
  END;

  -- T5: Recommendations doesn't crash
  BEGIN
    SELECT COUNT(*) INTO rec_count 
    FROM public.rpc_recommendations_v1(
      p_site_id,
      (NOW() AT TIME ZONE 'Europe/Paris')::date - 30,
      (NOW() AT TIME ZONE 'Europe/Paris')::date
    );
    
    v_test_key := 'T5_recommendations';
    v_ok := true;
    v_details := 'rows=' || rec_count;
    RETURN QUERY SELECT v_test_key, v_ok, v_details;
  EXCEPTION WHEN OTHERS THEN
    v_test_key := 'T5_recommendations';
    v_ok := false;
    v_details := 'error=' || SQLERRM;
    RETURN QUERY SELECT v_test_key, v_ok, v_details;
  END;

  -- T6: Analytics consistency check (operations vs analytics_daily)
  BEGIN
    -- Get sum from operations for last 30 days
    SELECT COALESCE(SUM(COALESCE(price_cb, 0) + COALESCE(price_esp, 0)), 0)
    INTO ops_revenue
    FROM public.operations
    WHERE site_id = p_site_id
      AND operation_date >= (NOW() AT TIME ZONE 'Europe/Paris')::date - 30
      AND operation_date <= (NOW() AT TIME ZONE 'Europe/Paris')::date;
    
    -- Get sum from analytics_daily for same period
    SELECT COALESCE(SUM(COALESCE(revenue, 0)), 0)
    INTO analytics_revenue
    FROM public.analytics_daily
    WHERE site_id = p_site_id
      AND date >= (NOW() AT TIME ZONE 'Europe/Paris')::date - 30
      AND date <= (NOW() AT TIME ZONE 'Europe/Paris')::date;
    
    -- Calculate difference
    revenue_diff := ABS(ops_revenue - analytics_revenue);
    
    -- Allow 1% tolerance or if both are 0
    v_test_key := 'T6_analytics_consistency';
    IF ops_revenue = 0 AND analytics_revenue = 0 THEN
      v_ok := true;
      v_details := 'both_zero';
    ELSIF ops_revenue > 0 AND (revenue_diff / ops_revenue) <= 0.01 THEN
      v_ok := true;
      v_details := 'ops=' || ROUND(ops_revenue, 2) || ' analytics=' || ROUND(analytics_revenue, 2) || ' diff=' || ROUND(revenue_diff, 2);
    ELSIF analytics_revenue = 0 AND ops_revenue > 0 THEN
      v_ok := false;
      v_details := 'analytics_empty ops=' || ROUND(ops_revenue, 2);
    ELSE
      v_ok := false;
      v_details := 'mismatch ops=' || ROUND(ops_revenue, 2) || ' analytics=' || ROUND(analytics_revenue, 2) || ' diff=' || ROUND(revenue_diff, 2);
    END IF;
    RETURN QUERY SELECT v_test_key, v_ok, v_details;
  EXCEPTION WHEN OTHERS THEN
    v_test_key := 'T6_analytics_consistency';
    v_ok := false;
    v_details := 'error=' || SQLERRM;
    RETURN QUERY SELECT v_test_key, v_ok, v_details;
  END;

END;
$$;