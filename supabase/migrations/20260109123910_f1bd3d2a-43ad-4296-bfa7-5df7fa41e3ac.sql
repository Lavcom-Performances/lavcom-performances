-- =====================================================
-- TAEX-179: Platform Sales Dashboard - stripe_invoices table
-- =====================================================

-- Create stripe_invoices table
CREATE TABLE IF NOT EXISTS public.stripe_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_invoice_id text UNIQUE NOT NULL,
  stripe_customer_id text,
  stripe_subscription_id text,
  user_id uuid,
  customer_email text,
  status text,
  currency text DEFAULT 'eur',
  amount_total integer,
  amount_subtotal integer,
  amount_tax integer,
  created_at timestamptz,
  paid_at timestamptz,
  hosted_invoice_url text,
  invoice_pdf text,
  lines jsonb,
  metadata jsonb,
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stripe_invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stripe_invoices
-- SELECT: platform admin or billing
CREATE POLICY "Platform admins and billing can view invoices"
  ON public.stripe_invoices
  FOR SELECT
  USING (
    is_platform_admin(auth.uid()) OR is_platform_billing(auth.uid())
  );

-- INSERT: service role only (handled by edge function)
-- No policy needed as service role bypasses RLS

-- UPDATE: service role only
-- No policy needed as service role bypasses RLS

-- DELETE: super_admin only (optional safety)
CREATE POLICY "Only super_admin can delete invoices"
  ON public.stripe_invoices
  FOR DELETE
  USING (is_platform_super_admin(auth.uid()));

-- Create index for common queries
CREATE INDEX IF NOT EXISTS idx_stripe_invoices_status ON public.stripe_invoices(status);
CREATE INDEX IF NOT EXISTS idx_stripe_invoices_created_at ON public.stripe_invoices(created_at);
CREATE INDEX IF NOT EXISTS idx_stripe_invoices_user_id ON public.stripe_invoices(user_id);

-- =====================================================
-- RPC functions for sales dashboard
-- =====================================================

-- RPC: Get sales overview stats
CREATE OR REPLACE FUNCTION public.rpc_platform_admin_sales_overview(
  p_year integer DEFAULT EXTRACT(YEAR FROM now())::integer,
  p_month integer DEFAULT EXTRACT(MONTH FROM now())::integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  -- Check platform access
  IF NOT (is_platform_admin(auth.uid()) OR is_platform_billing(auth.uid())) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT json_build_object(
    'month_total', COALESCE((
      SELECT SUM(amount_total) 
      FROM stripe_invoices 
      WHERE status = 'paid'
        AND EXTRACT(YEAR FROM paid_at) = p_year
        AND EXTRACT(MONTH FROM paid_at) = p_month
    ), 0),
    'year_total', COALESCE((
      SELECT SUM(amount_total) 
      FROM stripe_invoices 
      WHERE status = 'paid'
        AND EXTRACT(YEAR FROM paid_at) = p_year
    ), 0),
    'month_count', COALESCE((
      SELECT COUNT(*) 
      FROM stripe_invoices 
      WHERE status = 'paid'
        AND EXTRACT(YEAR FROM paid_at) = p_year
        AND EXTRACT(MONTH FROM paid_at) = p_month
    ), 0),
    'year_count', COALESCE((
      SELECT COUNT(*) 
      FROM stripe_invoices 
      WHERE status = 'paid'
        AND EXTRACT(YEAR FROM paid_at) = p_year
    ), 0),
    'avg_basket', COALESCE((
      SELECT AVG(amount_total)::integer 
      FROM stripe_invoices 
      WHERE status = 'paid'
        AND EXTRACT(YEAR FROM paid_at) = p_year
    ), 0)
  ) INTO result;

  RETURN result;
END;
$$;

-- RPC: Get monthly revenue for chart
CREATE OR REPLACE FUNCTION public.rpc_platform_admin_monthly_revenue(
  p_year integer DEFAULT EXTRACT(YEAR FROM now())::integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  -- Check platform access
  IF NOT (is_platform_admin(auth.uid()) OR is_platform_billing(auth.uid())) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT json_agg(row_to_json(t))
  FROM (
    SELECT 
      EXTRACT(MONTH FROM paid_at)::integer as month,
      COALESCE(SUM(amount_total), 0) as total,
      COALESCE(SUM(amount_subtotal), 0) as subtotal,
      COALESCE(SUM(amount_tax), 0) as tax,
      COUNT(*) as count
    FROM stripe_invoices
    WHERE status = 'paid'
      AND EXTRACT(YEAR FROM paid_at) = p_year
    GROUP BY EXTRACT(MONTH FROM paid_at)
    ORDER BY month
  ) t INTO result;

  RETURN COALESCE(result, '[]'::json);
END;
$$;

-- RPC: Get invoices list with pagination
CREATE OR REPLACE FUNCTION public.rpc_platform_admin_invoices(
  p_status text DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  total_count integer;
BEGIN
  -- Check platform access
  IF NOT (is_platform_admin(auth.uid()) OR is_platform_billing(auth.uid())) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Get total count
  SELECT COUNT(*) INTO total_count
  FROM stripe_invoices
  WHERE (p_status IS NULL OR status = p_status)
    AND (p_start_date IS NULL OR created_at::date >= p_start_date)
    AND (p_end_date IS NULL OR created_at::date <= p_end_date);

  -- Get invoices
  SELECT json_build_object(
    'total', total_count,
    'invoices', COALESCE((
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT 
          id,
          stripe_invoice_id,
          customer_email,
          status,
          currency,
          amount_total,
          amount_subtotal,
          amount_tax,
          created_at,
          paid_at,
          hosted_invoice_url,
          invoice_pdf,
          lines
        FROM stripe_invoices
        WHERE (p_status IS NULL OR status = p_status)
          AND (p_start_date IS NULL OR created_at::date >= p_start_date)
          AND (p_end_date IS NULL OR created_at::date <= p_end_date)
        ORDER BY created_at DESC
        LIMIT p_limit
        OFFSET p_offset
      ) t
    ), '[]'::json)
  ) INTO result;

  RETURN result;
END;
$$;

-- RPC: Get products aggregation
CREATE OR REPLACE FUNCTION public.rpc_platform_admin_products_sales(
  p_year integer DEFAULT EXTRACT(YEAR FROM now())::integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  -- Check platform access
  IF NOT (is_platform_admin(auth.uid()) OR is_platform_billing(auth.uid())) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Aggregate by price_id from lines
  SELECT json_agg(row_to_json(t))
  FROM (
    SELECT 
      line_item->>'price_id' as price_id,
      line_item->>'description' as description,
      COUNT(*) as sales_count,
      SUM((line_item->>'amount')::integer) as total_amount
    FROM stripe_invoices,
         jsonb_array_elements(lines) as line_item
    WHERE status = 'paid'
      AND EXTRACT(YEAR FROM paid_at) = p_year
      AND line_item->>'price_id' IS NOT NULL
    GROUP BY line_item->>'price_id', line_item->>'description'
    ORDER BY total_amount DESC
  ) t INTO result;

  RETURN COALESCE(result, '[]'::json);
END;
$$;