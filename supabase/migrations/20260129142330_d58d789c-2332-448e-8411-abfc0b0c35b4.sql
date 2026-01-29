
-- Fix rpc_dashboard_kpis function - operation_time is already TIME type, no need to concatenate ':00'
CREATE OR REPLACE FUNCTION public.rpc_dashboard_kpis(p_site_id uuid, p_start_date date, p_end_date date)
 RETURNS TABLE(total_revenue numeric, revenue_cb numeric, revenue_esp numeric, total_transactions bigint, average_basket numeric, unique_machines bigint, peak_hour integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(o.amount), 0)::numeric as total_revenue,
    COALESCE(SUM(CASE WHEN UPPER(o.payment_mode) = 'CB' THEN o.amount ELSE 0 END), 0)::numeric as revenue_cb,
    COALESCE(SUM(CASE WHEN UPPER(o.payment_mode) = 'ESP' THEN o.amount ELSE 0 END), 0)::numeric as revenue_esp,
    COUNT(*)::bigint as total_transactions,
    CASE WHEN COUNT(*) > 0 THEN (SUM(o.amount) / COUNT(*))::numeric ELSE 0 END as average_basket,
    COUNT(DISTINCT o.machine)::bigint as unique_machines,
    (
      SELECT EXTRACT(HOUR FROM o2.operation_time)::integer
      FROM operations o2
      WHERE o2.site_id = p_site_id
        AND o2.operation_date >= p_start_date
        AND o2.operation_date <= p_end_date
        AND o2.operation_time IS NOT NULL
        AND (o2.machine IS NULL OR o2.machine NOT ILIKE '%rech%')
      GROUP BY EXTRACT(HOUR FROM o2.operation_time)
      ORDER BY COUNT(*) DESC
      LIMIT 1
    ) as peak_hour
  FROM operations o
  WHERE o.site_id = p_site_id
    AND o.operation_date >= p_start_date
    AND o.operation_date <= p_end_date
    AND (o.machine IS NULL OR o.machine NOT ILIKE '%rech%');
END;
$function$;
