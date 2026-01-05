-- Drop the existing SECURITY DEFINER view and recreate without it
DROP VIEW IF EXISTS public.v_data_quality_operations;

-- Recreate the view without SECURITY DEFINER
CREATE OR REPLACE VIEW public.v_data_quality_operations AS
SELECT
  COUNT(*) AS total_operations,
  COUNT(*) FILTER (WHERE site_id IS NULL) AS missing_site_id,
  COUNT(*) FILTER (WHERE operation_date IS NULL) AS missing_operation_date,
  COUNT(*) FILTER (WHERE amount < 1 AND amount > 0) AS suspicious_amounts_centimes,
  COUNT(*) FILTER (WHERE type = 'esp_topup' AND price_esp > 0 AND price_cb = 0) AS esp_topup_missing_sales_candidates
FROM public.operations;

-- Ensure only service_role can access (for admin RPC functions only)
REVOKE ALL ON public.v_data_quality_operations FROM anon, authenticated;
GRANT SELECT ON public.v_data_quality_operations TO service_role;