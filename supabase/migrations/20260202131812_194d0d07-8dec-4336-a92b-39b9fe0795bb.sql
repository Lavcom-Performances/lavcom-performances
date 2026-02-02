-- Add beta program fields to organizations table
ALTER TABLE public.organizations 
ADD COLUMN is_beta boolean NOT NULL DEFAULT false,
ADD COLUMN beta_started_at timestamptz NULL,
ADD COLUMN beta_ends_at timestamptz NULL,
ADD COLUMN beta_price_cents integer NULL,
ADD COLUMN standard_price_cents integer NOT NULL DEFAULT 2900;

-- Add constraint to ensure beta fields are consistent
ALTER TABLE public.organizations 
ADD CONSTRAINT chk_beta_fields_consistency 
CHECK (
  (is_beta = false) OR 
  (is_beta = true AND beta_started_at IS NOT NULL AND beta_ends_at IS NOT NULL AND beta_price_cents IS NOT NULL)
);

-- Create index for beta status queries
CREATE INDEX idx_organizations_is_beta ON public.organizations(is_beta) WHERE is_beta = true;

-- Create RPC function to get effective price per laundromat for a company
CREATE OR REPLACE FUNCTION public.rpc_effective_price_per_laundromat(p_organization_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_org record;
BEGIN
  SELECT is_beta, beta_ends_at, beta_price_cents, standard_price_cents
  INTO v_org
  FROM public.organizations
  WHERE id = p_organization_id;
  
  IF NOT FOUND THEN
    RETURN 2900; -- Default standard price
  END IF;
  
  -- If in beta and beta hasn't expired
  IF v_org.is_beta = true AND v_org.beta_ends_at > now() THEN
    RETURN COALESCE(v_org.beta_price_cents, 900);
  ELSE
    RETURN COALESCE(v_org.standard_price_cents, 2900);
  END IF;
END;
$$;

-- Create RPC to get company beta status (for SaaS UI)
CREATE OR REPLACE FUNCTION public.rpc_get_company_beta_status(p_organization_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_org record;
  v_effective_price integer;
  v_days_remaining integer;
BEGIN
  SELECT is_beta, beta_started_at, beta_ends_at, beta_price_cents, standard_price_cents
  INTO v_org
  FROM public.organizations
  WHERE id = p_organization_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'is_beta', false,
      'effective_price_cents', 2900
    );
  END IF;
  
  v_effective_price := public.rpc_effective_price_per_laundromat(p_organization_id);
  
  IF v_org.is_beta = true AND v_org.beta_ends_at > now() THEN
    v_days_remaining := EXTRACT(DAY FROM (v_org.beta_ends_at - now()))::integer;
    RETURN jsonb_build_object(
      'is_beta', true,
      'beta_started_at', v_org.beta_started_at,
      'beta_ends_at', v_org.beta_ends_at,
      'beta_price_cents', v_org.beta_price_cents,
      'standard_price_cents', v_org.standard_price_cents,
      'effective_price_cents', v_effective_price,
      'days_remaining', v_days_remaining
    );
  ELSE
    RETURN jsonb_build_object(
      'is_beta', false,
      'effective_price_cents', v_effective_price,
      'standard_price_cents', v_org.standard_price_cents
    );
  END IF;
END;
$$;

-- Platform Admin function to list beta companies
CREATE OR REPLACE FUNCTION public.rpc_platform_admin_beta_companies(p_limit integer DEFAULT 100, p_offset integer DEFAULT 0)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result json;
BEGIN
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  SELECT json_build_object(
    'total', (
      SELECT count(*) FROM organizations WHERE is_beta = true
    ),
    'companies', (
      SELECT json_agg(row_to_json(c)) FROM (
        SELECT 
          o.id,
          o.name,
          o.is_beta,
          o.beta_started_at,
          o.beta_ends_at,
          o.beta_price_cents,
          o.standard_price_cents,
          public.rpc_effective_price_per_laundromat(o.id) as effective_price_cents,
          CASE 
            WHEN o.beta_ends_at > now() THEN EXTRACT(DAY FROM (o.beta_ends_at - now()))::integer
            ELSE 0
          END as days_remaining,
          (SELECT count(*) FROM sites s WHERE s.organization_id = o.id AND s.status = 'active') as active_laundromats
        FROM organizations o
        WHERE o.is_beta = true
        ORDER BY o.beta_ends_at ASC
        LIMIT p_limit OFFSET p_offset
      ) c
    )
  ) INTO result;
  
  RETURN result;
END;
$$;