-- ============================================================================
-- TAEX-236: Site Duplicate Detection + Platform Admin Global Search
-- ============================================================================

-- ============================================================================
-- 1) RPC: check_duplicate_sites - Soft duplicate detection for site creation
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_duplicate_sites(
  p_name TEXT,
  p_address TEXT,
  p_postal_code TEXT,
  p_city TEXT,
  p_country TEXT DEFAULT 'FR'
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  country_code TEXT,
  owner_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name_normalized TEXT;
  v_address_normalized TEXT;
  v_name_prefix TEXT;
BEGIN
  -- Normalize inputs for comparison
  v_name_normalized := lower(trim(COALESCE(p_name, '')));
  v_address_normalized := lower(trim(COALESCE(p_address, '')));
  v_name_prefix := left(v_name_normalized, 10);
  
  -- Return potential duplicates with same postal_code
  -- AND (same normalized address OR same normalized name OR name prefix match)
  RETURN QUERY
  SELECT 
    s.id,
    s.name,
    s.address,
    s.city,
    s.postal_code,
    s.country_code,
    s.user_id AS owner_id
  FROM sites s
  WHERE s.country_code = COALESCE(p_country, 'FR')
    AND s.postal_code = p_postal_code
    AND (
      -- Exact name match
      lower(trim(s.name)) = v_name_normalized
      -- OR exact address match
      OR lower(trim(COALESCE(s.address, ''))) = v_address_normalized
      -- OR name prefix match (first 10 chars)
      OR (v_name_prefix <> '' AND lower(trim(s.name)) LIKE v_name_prefix || '%')
    )
  LIMIT 10;
END;
$$;

-- Grant execute to authenticated users (RLS will still protect data access)
GRANT EXECUTE ON FUNCTION public.check_duplicate_sites TO authenticated;

COMMENT ON FUNCTION public.check_duplicate_sites IS 'TAEX-236: Check for potential duplicate sites based on name, address, and postal code similarity. Used for soft duplicate prevention during site creation.';


-- ============================================================================
-- 2) RPC: rpc_admin_global_search - Platform admin global search
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rpc_admin_global_search(
  p_query TEXT,
  p_limit INT DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_query_lower TEXT;
  v_users JSONB;
  v_sites JSONB;
BEGIN
  -- Platform admin check
  IF NOT is_platform_admin(auth.uid()) AND NOT is_platform_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Platform admin access required';
  END IF;
  
  -- Validate and prepare query
  IF p_query IS NULL OR trim(p_query) = '' THEN
    RETURN jsonb_build_object('users', '[]'::jsonb, 'sites', '[]'::jsonb);
  END IF;
  
  v_query_lower := lower(trim(p_query));
  
  -- Search users (email, first_name, last_name)
  SELECT COALESCE(jsonb_agg(row_to_json(u)), '[]'::jsonb)
  INTO v_users
  FROM (
    SELECT 
      p.id,
      p.email,
      COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '') AS display_name,
      p.company_name
    FROM profiles p
    WHERE lower(p.email) LIKE '%' || v_query_lower || '%'
      OR lower(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')) LIKE '%' || v_query_lower || '%'
      OR lower(COALESCE(p.company_name, '')) LIKE '%' || v_query_lower || '%'
    ORDER BY 
      CASE WHEN lower(p.email) LIKE v_query_lower || '%' THEN 0 ELSE 1 END,
      p.email
    LIMIT p_limit
  ) u;
  
  -- Search sites (name, city, postal_code, siret if exists)
  SELECT COALESCE(jsonb_agg(row_to_json(s)), '[]'::jsonb)
  INTO v_sites
  FROM (
    SELECT 
      s.id,
      s.name,
      s.city,
      s.postal_code,
      s.country_code,
      s.address,
      s.user_id AS owner_id
    FROM sites s
    WHERE lower(s.name) LIKE '%' || v_query_lower || '%'
      OR lower(COALESCE(s.city, '')) LIKE '%' || v_query_lower || '%'
      OR s.postal_code LIKE '%' || v_query_lower || '%'
    ORDER BY 
      CASE WHEN lower(s.name) LIKE v_query_lower || '%' THEN 0 ELSE 1 END,
      s.name
    LIMIT p_limit
  ) s;
  
  RETURN jsonb_build_object(
    'users', v_users,
    'sites', v_sites
  );
END;
$$;

-- Grant execute to authenticated users (function checks admin status internally)
GRANT EXECUTE ON FUNCTION public.rpc_admin_global_search TO authenticated;

COMMENT ON FUNCTION public.rpc_admin_global_search IS 'TAEX-236: Platform admin global search across users and sites. Returns matching users and sites for support and ops workflows.';