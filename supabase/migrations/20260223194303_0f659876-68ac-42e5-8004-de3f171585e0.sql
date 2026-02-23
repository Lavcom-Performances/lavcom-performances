
-- RPC to get data quality stats without hitting 1000-row limit
CREATE OR REPLACE FUNCTION rpc_data_quality_stats(
  p_site_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  operations_count BIGINT,
  total_revenue NUMERIC,
  min_date DATE,
  max_date DATE,
  min_hour INT,
  max_hour INT,
  distinct_days BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS operations_count,
    COALESCE(SUM(o.amount), 0)::NUMERIC AS total_revenue,
    MIN(o.operation_date)::DATE AS min_date,
    MAX(o.operation_date)::DATE AS max_date,
    MIN(CASE WHEN o.operation_time IS NOT NULL THEN EXTRACT(HOUR FROM o.operation_time::TIME)::INT END) AS min_hour,
    MAX(CASE WHEN o.operation_time IS NOT NULL THEN EXTRACT(HOUR FROM o.operation_time::TIME)::INT END) AS max_hour,
    COUNT(DISTINCT o.operation_date)::BIGINT AS distinct_days
  FROM public.operations o
  WHERE o.site_id = p_site_id
    AND (p_start_date IS NULL OR o.operation_date >= p_start_date)
    AND (p_end_date IS NULL OR o.operation_date <= p_end_date);
END;
$$;
