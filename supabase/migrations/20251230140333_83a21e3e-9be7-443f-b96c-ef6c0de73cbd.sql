-- Create RPC function for monthly revenue
CREATE OR REPLACE FUNCTION public.rpc_monthly_revenue(
  p_site_id uuid,
  p_year int
)
RETURNS TABLE (
  month int,
  revenue_total numeric,
  revenue_cb numeric,
  revenue_esp numeric,
  transactions_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXTRACT(month FROM operation_date)::int AS month,
    COALESCE(SUM(COALESCE(price_cb, 0) + COALESCE(price_esp, 0)), 0) AS revenue_total,
    COALESCE(SUM(COALESCE(price_cb, 0)), 0) AS revenue_cb,
    COALESCE(SUM(COALESCE(price_esp, 0)), 0) AS revenue_esp,
    COUNT(*) AS transactions_count
  FROM public.operations
  WHERE site_id = p_site_id
    AND user_id = auth.uid()
    AND EXTRACT(year FROM operation_date)::int = p_year
  GROUP BY 1
  ORDER BY 1;
$$;