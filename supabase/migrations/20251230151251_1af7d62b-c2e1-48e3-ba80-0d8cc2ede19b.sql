-- Create rpc_monthly_revenue_range function with date range support
CREATE OR REPLACE FUNCTION public.rpc_monthly_revenue_range(
  p_site_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (
  year integer,
  month integer,
  revenue_total numeric,
  revenue_cb numeric,
  revenue_esp numeric,
  transactions_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    EXTRACT(year FROM operation_date)::int AS year,
    EXTRACT(month FROM operation_date)::int AS month,
    COALESCE(SUM(COALESCE(price_cb, 0) + COALESCE(price_esp, 0)), 0) AS revenue_total,
    COALESCE(SUM(COALESCE(price_cb, 0)), 0) AS revenue_cb,
    COALESCE(SUM(COALESCE(price_esp, 0)), 0) AS revenue_esp,
    COUNT(*) AS transactions_count
  FROM public.operations
  WHERE site_id = p_site_id
    AND user_id = auth.uid()
    AND operation_date BETWEEN p_start_date AND p_end_date
  GROUP BY 1, 2
  ORDER BY 1, 2;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.rpc_monthly_revenue_range(uuid, date, date) TO authenticated;