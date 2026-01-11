
-- Mettre à jour la fonction RPC pour utiliser price_cb et price_esp
-- CA total = price_cb + price_esp (pas amount)
-- CA CB = price_cb
-- CA ESP = price_esp

CREATE OR REPLACE FUNCTION public.rpc_operations_calendar_kpis(p_site_id uuid)
RETURNS TABLE(
  period text,
  revenue_total numeric,
  revenue_cb numeric,
  revenue_esp numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH today_data AS (
    SELECT 
      COALESCE(SUM(COALESCE(price_cb, 0)), 0) AS cb,
      COALESCE(SUM(COALESCE(price_esp, 0)), 0) AS esp
    FROM operations
    WHERE site_id = p_site_id
      AND operation_date = CURRENT_DATE
  ),
  month_data AS (
    SELECT 
      COALESCE(SUM(COALESCE(price_cb, 0)), 0) AS cb,
      COALESCE(SUM(COALESCE(price_esp, 0)), 0) AS esp
    FROM operations
    WHERE site_id = p_site_id
      AND date_trunc('month', operation_date) = date_trunc('month', CURRENT_DATE)
  ),
  year_data AS (
    SELECT 
      COALESCE(SUM(COALESCE(price_cb, 0)), 0) AS cb,
      COALESCE(SUM(COALESCE(price_esp, 0)), 0) AS esp
    FROM operations
    WHERE site_id = p_site_id
      AND date_trunc('year', operation_date) = date_trunc('year', CURRENT_DATE)
  )
  SELECT 'day'::text, (t.cb + t.esp), t.cb, t.esp FROM today_data t
  UNION ALL
  SELECT 'month'::text, (m.cb + m.esp), m.cb, m.esp FROM month_data m
  UNION ALL
  SELECT 'year'::text, (y.cb + y.esp), y.cb, y.esp FROM year_data y;
END;
$$;
