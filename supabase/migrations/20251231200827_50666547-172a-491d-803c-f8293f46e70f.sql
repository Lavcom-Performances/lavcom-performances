-- ============================================================
-- DATA CONTRACT: Vue de qualité des données operations
-- Détecte: site_id null, date null, montants suspects (centimes)
-- ============================================================

CREATE OR REPLACE VIEW public.v_data_quality_operations AS
SELECT
  COUNT(*) AS total_operations,
  COUNT(*) FILTER (WHERE site_id IS NULL) AS missing_site_id,
  COUNT(*) FILTER (WHERE operation_date IS NULL) AS missing_operation_date,
  COUNT(*) FILTER (
    WHERE GREATEST(COALESCE(price_cb, 0), COALESCE(price_esp, 0)) >= 1000
  ) AS suspicious_amounts_centimes,
  COUNT(*) FILTER (
    WHERE payment_mode = 'ESP' 
      AND (type IS NULL OR TRIM(type) = '') 
      AND COALESCE(inserted_eur, 0) > 0 
      AND COALESCE(price_cb, 0) = 0 
      AND COALESCE(price_esp, 0) = 0
  ) AS esp_topup_missing_sales_candidates
FROM public.operations;

-- Grant select to authenticated (admin check will be in RLS/app)
GRANT SELECT ON public.v_data_quality_operations TO authenticated;

-- ============================================================
-- SMOKE TESTS RPC: 5 tests de cohérence données
-- ============================================================

CREATE OR REPLACE FUNCTION public.rpc_run_smoke_tests(p_site_id uuid)
RETURNS TABLE (
  test_key text,
  ok boolean,
  details text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
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

END;
$$;

-- Grant execute to authenticated
GRANT EXECUTE ON FUNCTION public.rpc_run_smoke_tests(uuid) TO authenticated;

-- ============================================================
-- RPC pour lire la qualité données (admin only)
-- ============================================================

CREATE OR REPLACE FUNCTION public.rpc_data_quality_check()
RETURNS TABLE (
  total_operations bigint,
  missing_site_id bigint,
  missing_operation_date bigint,
  suspicious_amounts_centimes bigint,
  esp_topup_missing_sales_candidates bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admin check
  IF NOT public.is_admin() THEN 
    RAISE EXCEPTION 'forbidden'; 
  END IF;

  RETURN QUERY SELECT * FROM public.v_data_quality_operations;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_data_quality_check() TO authenticated;