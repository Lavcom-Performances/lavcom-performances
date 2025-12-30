-- Create rpc_date_bounds function to get min/max operation dates for a site
CREATE OR REPLACE FUNCTION public.rpc_date_bounds(p_site_id uuid)
RETURNS TABLE (
  min_date date,
  max_date date,
  total_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    MIN(operation_date) AS min_date,
    MAX(operation_date) AS max_date,
    COUNT(*) AS total_count
  FROM public.operations
  WHERE site_id = p_site_id
    AND user_id = auth.uid();
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.rpc_date_bounds(uuid) TO authenticated;