
CREATE OR REPLACE FUNCTION rpc_operations_period_kpis(
  p_site_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_payment_mode TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE(
  total_ca NUMERIC,
  ca_cb NUMERIC,
  ca_esp NUMERIC,
  op_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(
      CASE WHEN UPPER(o.payment_mode) IN ('CB','ESP')
           AND (o.machine IS NULL OR o.machine NOT ILIKE '%rech%')
           AND (o.machine_name IS NULL OR o.machine_name NOT ILIKE '%rech%')
           AND UPPER(COALESCE(o.payment_mode,'')) NOT IN ('FI','FIDELITE','FIDÉLITÉ')
      THEN o.amount ELSE 0 END
    ), 0)::NUMERIC,
    COALESCE(SUM(
      CASE WHEN UPPER(o.payment_mode) = 'CB'
           AND (o.machine IS NULL OR o.machine NOT ILIKE '%rech%')
           AND (o.machine_name IS NULL OR o.machine_name NOT ILIKE '%rech%')
      THEN o.amount ELSE 0 END
    ), 0)::NUMERIC,
    COALESCE(SUM(
      CASE WHEN UPPER(o.payment_mode) = 'ESP'
           AND (o.machine IS NULL OR o.machine NOT ILIKE '%rech%')
           AND (o.machine_name IS NULL OR o.machine_name NOT ILIKE '%rech%')
      THEN o.amount ELSE 0 END
    ), 0)::NUMERIC,
    COALESCE(SUM(
      CASE WHEN UPPER(o.payment_mode) IN ('CB','ESP')
           AND (o.machine IS NULL OR o.machine NOT ILIKE '%rech%')
           AND (o.machine_name IS NULL OR o.machine_name NOT ILIKE '%rech%')
           AND UPPER(COALESCE(o.payment_mode,'')) NOT IN ('FI','FIDELITE','FIDÉLITÉ')
      THEN 1 ELSE 0 END
    ), 0)::BIGINT
  FROM operations o
  WHERE o.site_id = p_site_id
    AND (p_start_date IS NULL OR o.operation_date >= p_start_date)
    AND (p_end_date IS NULL OR o.operation_date <= p_end_date)
    AND (p_payment_mode IS NULL OR p_payment_mode = 'all' OR UPPER(o.payment_mode) = UPPER(p_payment_mode))
    AND (p_search IS NULL OR p_search = '' OR 
         o.machine ILIKE '%' || p_search || '%' OR 
         o.machine_name ILIKE '%' || p_search || '%' OR
         o.program ILIKE '%' || p_search || '%');
END;
$$;
