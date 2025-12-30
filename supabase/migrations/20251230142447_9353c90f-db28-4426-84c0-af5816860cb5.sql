-- Create RPC function for recommendations
CREATE OR REPLACE FUNCTION public.rpc_recommendations_v1(
  p_site_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (
  rec_key text,
  severity text,
  title text,
  description text,
  impact_estimated numeric,
  effort text,
  meta jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rev_total numeric;
  tx_count bigint;
BEGIN
  SELECT
    COALESCE(SUM(COALESCE(price_cb, 0) + COALESCE(price_esp, 0)), 0),
    COUNT(*)
  INTO rev_total, tx_count
  FROM public.operations
  WHERE site_id = p_site_id
    AND user_id = auth.uid()
    AND operation_date BETWEEN p_start_date AND p_end_date;

  -- R1: insufficient data
  IF tx_count < 30 THEN
    RETURN QUERY
    SELECT
      'insufficient_data'::text,
      'warning'::text,
      'Données insuffisantes'::text,
      'Le volume de transactions est faible sur la période sélectionnée. Importez davantage de jours ou élargissez la période.'::text,
      NULL::numeric,
      'Faible'::text,
      jsonb_build_object('transactions', tx_count, 'revenue_total', rev_total);
  END IF;

  -- R2: low average basket
  IF tx_count > 0 AND (rev_total / tx_count) < 4.0 THEN
    RETURN QUERY
    SELECT
      'avg_basket_low'::text,
      'opportunity'::text,
      'Panier moyen perfectible'::text,
      'Le panier moyen est bas sur la période. Testez une légère hausse sur certaines machines ou des packs (lavage+séchoir).'::text,
      NULL::numeric,
      'Moyen'::text,
      jsonb_build_object('avg_basket', ROUND(rev_total / tx_count, 2));
  END IF;

  RETURN;
END;
$$;

-- Create RPC function for dashboard KPIs
CREATE OR REPLACE FUNCTION public.rpc_dashboard_kpis(
  p_site_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (
  total_revenue numeric,
  total_transactions bigint,
  revenue_cb numeric,
  revenue_esp numeric,
  average_basket numeric,
  unique_machines bigint,
  peak_hour int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH stats AS (
    SELECT
      COALESCE(SUM(COALESCE(price_cb, 0) + COALESCE(price_esp, 0)), 0) AS total_revenue,
      COUNT(*) AS total_transactions,
      COALESCE(SUM(COALESCE(price_cb, 0)), 0) AS revenue_cb,
      COALESCE(SUM(COALESCE(price_esp, 0)), 0) AS revenue_esp,
      COUNT(DISTINCT machine_name) AS unique_machines
    FROM public.operations
    WHERE site_id = p_site_id
      AND user_id = auth.uid()
      AND operation_date BETWEEN p_start_date AND p_end_date
  ),
  peak AS (
    SELECT EXTRACT(hour FROM operation_time)::int AS hr, COUNT(*) AS cnt
    FROM public.operations
    WHERE site_id = p_site_id
      AND user_id = auth.uid()
      AND operation_date BETWEEN p_start_date AND p_end_date
      AND operation_time IS NOT NULL
    GROUP BY 1
    ORDER BY cnt DESC
    LIMIT 1
  )
  SELECT
    s.total_revenue,
    s.total_transactions,
    s.revenue_cb,
    s.revenue_esp,
    CASE WHEN s.total_transactions > 0 THEN ROUND(s.total_revenue / s.total_transactions, 2) ELSE 0 END AS average_basket,
    s.unique_machines,
    COALESCE(p.hr, 0) AS peak_hour
  FROM stats s
  LEFT JOIN peak p ON true;
$$;