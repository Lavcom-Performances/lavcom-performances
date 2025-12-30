-- RPC: Operations calendar KPIs (fixed: today, month, year)
-- Uses price_cb and price_esp columns, timezone Europe/Paris

CREATE OR REPLACE FUNCTION public.rpc_operations_calendar_kpis(p_site_id uuid)
RETURNS TABLE (
  period text,
  revenue_total numeric,
  revenue_cb numeric,
  revenue_esp numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- ownership check (multi-tenant)
  IF NOT EXISTS (
    SELECT 1 FROM public.sites
    WHERE id = p_site_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT
      (operation_date AT TIME ZONE 'Europe/Paris')::date AS d,
      COALESCE(price_cb, 0) AS cb,
      COALESCE(price_esp, 0) AS esp
    FROM public.operations
    WHERE site_id = p_site_id
      AND user_id = auth.uid()
  ),
  today_data AS (
    SELECT
      'day'::text AS period,
      COALESCE(SUM(cb + esp), 0) AS revenue_total,
      COALESCE(SUM(cb), 0) AS revenue_cb,
      COALESCE(SUM(esp), 0) AS revenue_esp
    FROM base
    WHERE d = (NOW() AT TIME ZONE 'Europe/Paris')::date
  ),
  month_data AS (
    SELECT
      'month'::text AS period,
      COALESCE(SUM(cb + esp), 0) AS revenue_total,
      COALESCE(SUM(cb), 0) AS revenue_cb,
      COALESCE(SUM(esp), 0) AS revenue_esp
    FROM base
    WHERE date_trunc('month', d) = date_trunc('month', (NOW() AT TIME ZONE 'Europe/Paris')::date)
  ),
  year_data AS (
    SELECT
      'year'::text AS period,
      COALESCE(SUM(cb + esp), 0) AS revenue_total,
      COALESCE(SUM(cb), 0) AS revenue_cb,
      COALESCE(SUM(esp), 0) AS revenue_esp
    FROM base
    WHERE EXTRACT(year FROM d) = EXTRACT(year FROM (NOW() AT TIME ZONE 'Europe/Paris')::date)
  )
  SELECT * FROM today_data
  UNION ALL SELECT * FROM month_data
  UNION ALL SELECT * FROM year_data;
END;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION public.rpc_operations_calendar_kpis(uuid) TO authenticated;