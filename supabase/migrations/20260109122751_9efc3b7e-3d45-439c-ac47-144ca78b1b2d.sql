-- =============================================
-- PLATFORM ROLES (séparé des user_roles entreprise)
-- =============================================

-- Enum pour les rôles plateforme
CREATE TYPE public.platform_role AS ENUM ('super_admin', 'admin', 'billing');

-- Table platform_roles
CREATE TABLE public.platform_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role platform_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.platform_roles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- HELPER FUNCTIONS (SECURITY DEFINER)
-- =============================================

-- Check if user is platform super_admin
CREATE OR REPLACE FUNCTION public.is_platform_super_admin(uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_roles
    WHERE user_id = uid AND role = 'super_admin'
  )
$$;

-- Check if user is platform admin (includes super_admin)
CREATE OR REPLACE FUNCTION public.is_platform_admin(uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_roles
    WHERE user_id = uid AND role IN ('super_admin', 'admin')
  )
$$;

-- Check if user is platform billing
CREATE OR REPLACE FUNCTION public.is_platform_billing(uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_roles
    WHERE user_id = uid AND role IN ('super_admin', 'admin', 'billing')
  )
$$;

-- =============================================
-- RLS POLICIES FOR platform_roles
-- =============================================

-- Only super_admin can SELECT
CREATE POLICY "Platform super_admin can view platform_roles"
ON public.platform_roles FOR SELECT
USING (is_platform_super_admin(auth.uid()));

-- Only super_admin can INSERT
CREATE POLICY "Platform super_admin can insert platform_roles"
ON public.platform_roles FOR INSERT
WITH CHECK (is_platform_super_admin(auth.uid()));

-- Only super_admin can UPDATE
CREATE POLICY "Platform super_admin can update platform_roles"
ON public.platform_roles FOR UPDATE
USING (is_platform_super_admin(auth.uid()));

-- Only super_admin can DELETE
CREATE POLICY "Platform super_admin can delete platform_roles"
ON public.platform_roles FOR DELETE
USING (is_platform_super_admin(auth.uid()));

-- =============================================
-- FR GEO REGIONS (département -> région)
-- =============================================

CREATE TABLE public.fr_geo_regions (
  department_code text PRIMARY KEY,
  department_name text NOT NULL,
  region_code text NOT NULL,
  region_name text NOT NULL
);

-- Disable RLS (public reference data)
ALTER TABLE public.fr_geo_regions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read fr_geo_regions"
ON public.fr_geo_regions FOR SELECT
USING (true);

-- Insert all French departments with regions
INSERT INTO public.fr_geo_regions (department_code, department_name, region_code, region_name) VALUES
('01', 'Ain', 'ARA', 'Auvergne-Rhône-Alpes'),
('02', 'Aisne', 'HDF', 'Hauts-de-France'),
('03', 'Allier', 'ARA', 'Auvergne-Rhône-Alpes'),
('04', 'Alpes-de-Haute-Provence', 'PAC', 'Provence-Alpes-Côte d''Azur'),
('05', 'Hautes-Alpes', 'PAC', 'Provence-Alpes-Côte d''Azur'),
('06', 'Alpes-Maritimes', 'PAC', 'Provence-Alpes-Côte d''Azur'),
('07', 'Ardèche', 'ARA', 'Auvergne-Rhône-Alpes'),
('08', 'Ardennes', 'GES', 'Grand Est'),
('09', 'Ariège', 'OCC', 'Occitanie'),
('10', 'Aube', 'GES', 'Grand Est'),
('11', 'Aude', 'OCC', 'Occitanie'),
('12', 'Aveyron', 'OCC', 'Occitanie'),
('13', 'Bouches-du-Rhône', 'PAC', 'Provence-Alpes-Côte d''Azur'),
('14', 'Calvados', 'NOR', 'Normandie'),
('15', 'Cantal', 'ARA', 'Auvergne-Rhône-Alpes'),
('16', 'Charente', 'NAQ', 'Nouvelle-Aquitaine'),
('17', 'Charente-Maritime', 'NAQ', 'Nouvelle-Aquitaine'),
('18', 'Cher', 'CVL', 'Centre-Val de Loire'),
('19', 'Corrèze', 'NAQ', 'Nouvelle-Aquitaine'),
('2A', 'Corse-du-Sud', 'COR', 'Corse'),
('2B', 'Haute-Corse', 'COR', 'Corse'),
('21', 'Côte-d''Or', 'BFC', 'Bourgogne-Franche-Comté'),
('22', 'Côtes-d''Armor', 'BRE', 'Bretagne'),
('23', 'Creuse', 'NAQ', 'Nouvelle-Aquitaine'),
('24', 'Dordogne', 'NAQ', 'Nouvelle-Aquitaine'),
('25', 'Doubs', 'BFC', 'Bourgogne-Franche-Comté'),
('26', 'Drôme', 'ARA', 'Auvergne-Rhône-Alpes'),
('27', 'Eure', 'NOR', 'Normandie'),
('28', 'Eure-et-Loir', 'CVL', 'Centre-Val de Loire'),
('29', 'Finistère', 'BRE', 'Bretagne'),
('30', 'Gard', 'OCC', 'Occitanie'),
('31', 'Haute-Garonne', 'OCC', 'Occitanie'),
('32', 'Gers', 'OCC', 'Occitanie'),
('33', 'Gironde', 'NAQ', 'Nouvelle-Aquitaine'),
('34', 'Hérault', 'OCC', 'Occitanie'),
('35', 'Ille-et-Vilaine', 'BRE', 'Bretagne'),
('36', 'Indre', 'CVL', 'Centre-Val de Loire'),
('37', 'Indre-et-Loire', 'CVL', 'Centre-Val de Loire'),
('38', 'Isère', 'ARA', 'Auvergne-Rhône-Alpes'),
('39', 'Jura', 'BFC', 'Bourgogne-Franche-Comté'),
('40', 'Landes', 'NAQ', 'Nouvelle-Aquitaine'),
('41', 'Loir-et-Cher', 'CVL', 'Centre-Val de Loire'),
('42', 'Loire', 'ARA', 'Auvergne-Rhône-Alpes'),
('43', 'Haute-Loire', 'ARA', 'Auvergne-Rhône-Alpes'),
('44', 'Loire-Atlantique', 'PDL', 'Pays de la Loire'),
('45', 'Loiret', 'CVL', 'Centre-Val de Loire'),
('46', 'Lot', 'OCC', 'Occitanie'),
('47', 'Lot-et-Garonne', 'NAQ', 'Nouvelle-Aquitaine'),
('48', 'Lozère', 'OCC', 'Occitanie'),
('49', 'Maine-et-Loire', 'PDL', 'Pays de la Loire'),
('50', 'Manche', 'NOR', 'Normandie'),
('51', 'Marne', 'GES', 'Grand Est'),
('52', 'Haute-Marne', 'GES', 'Grand Est'),
('53', 'Mayenne', 'PDL', 'Pays de la Loire'),
('54', 'Meurthe-et-Moselle', 'GES', 'Grand Est'),
('55', 'Meuse', 'GES', 'Grand Est'),
('56', 'Morbihan', 'BRE', 'Bretagne'),
('57', 'Moselle', 'GES', 'Grand Est'),
('58', 'Nièvre', 'BFC', 'Bourgogne-Franche-Comté'),
('59', 'Nord', 'HDF', 'Hauts-de-France'),
('60', 'Oise', 'HDF', 'Hauts-de-France'),
('61', 'Orne', 'NOR', 'Normandie'),
('62', 'Pas-de-Calais', 'HDF', 'Hauts-de-France'),
('63', 'Puy-de-Dôme', 'ARA', 'Auvergne-Rhône-Alpes'),
('64', 'Pyrénées-Atlantiques', 'NAQ', 'Nouvelle-Aquitaine'),
('65', 'Hautes-Pyrénées', 'OCC', 'Occitanie'),
('66', 'Pyrénées-Orientales', 'OCC', 'Occitanie'),
('67', 'Bas-Rhin', 'GES', 'Grand Est'),
('68', 'Haut-Rhin', 'GES', 'Grand Est'),
('69', 'Rhône', 'ARA', 'Auvergne-Rhône-Alpes'),
('70', 'Haute-Saône', 'BFC', 'Bourgogne-Franche-Comté'),
('71', 'Saône-et-Loire', 'BFC', 'Bourgogne-Franche-Comté'),
('72', 'Sarthe', 'PDL', 'Pays de la Loire'),
('73', 'Savoie', 'ARA', 'Auvergne-Rhône-Alpes'),
('74', 'Haute-Savoie', 'ARA', 'Auvergne-Rhône-Alpes'),
('75', 'Paris', 'IDF', 'Île-de-France'),
('76', 'Seine-Maritime', 'NOR', 'Normandie'),
('77', 'Seine-et-Marne', 'IDF', 'Île-de-France'),
('78', 'Yvelines', 'IDF', 'Île-de-France'),
('79', 'Deux-Sèvres', 'NAQ', 'Nouvelle-Aquitaine'),
('80', 'Somme', 'HDF', 'Hauts-de-France'),
('81', 'Tarn', 'OCC', 'Occitanie'),
('82', 'Tarn-et-Garonne', 'OCC', 'Occitanie'),
('83', 'Var', 'PAC', 'Provence-Alpes-Côte d''Azur'),
('84', 'Vaucluse', 'PAC', 'Provence-Alpes-Côte d''Azur'),
('85', 'Vendée', 'PDL', 'Pays de la Loire'),
('86', 'Vienne', 'NAQ', 'Nouvelle-Aquitaine'),
('87', 'Haute-Vienne', 'NAQ', 'Nouvelle-Aquitaine'),
('88', 'Vosges', 'GES', 'Grand Est'),
('89', 'Yonne', 'BFC', 'Bourgogne-Franche-Comté'),
('90', 'Territoire de Belfort', 'BFC', 'Bourgogne-Franche-Comté'),
('91', 'Essonne', 'IDF', 'Île-de-France'),
('92', 'Hauts-de-Seine', 'IDF', 'Île-de-France'),
('93', 'Seine-Saint-Denis', 'IDF', 'Île-de-France'),
('94', 'Val-de-Marne', 'IDF', 'Île-de-France'),
('95', 'Val-d''Oise', 'IDF', 'Île-de-France'),
('971', 'Guadeloupe', 'GUA', 'Guadeloupe'),
('972', 'Martinique', 'MTQ', 'Martinique'),
('973', 'Guyane', 'GUF', 'Guyane'),
('974', 'La Réunion', 'REU', 'La Réunion'),
('976', 'Mayotte', 'MAY', 'Mayotte');

-- =============================================
-- ADD COLUMNS TO SITES TABLE
-- =============================================

ALTER TABLE public.sites 
ADD COLUMN IF NOT EXISTS department_code text,
ADD COLUMN IF NOT EXISTS country_code text DEFAULT 'FR';

-- Function to derive department code from postal code
CREATE OR REPLACE FUNCTION public.derive_department_code(postal_code text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF postal_code IS NULL OR length(postal_code) < 2 THEN
    RETURN NULL;
  END IF;
  
  -- Handle Corsica (20xxx -> 2A or 2B)
  IF left(postal_code, 2) = '20' THEN
    IF postal_code >= '20000' AND postal_code <= '20190' THEN
      RETURN '2A'; -- Corse-du-Sud
    ELSE
      RETURN '2B'; -- Haute-Corse
    END IF;
  END IF;
  
  -- Handle DOM-TOM (3 digit codes)
  IF left(postal_code, 3) IN ('971', '972', '973', '974', '976') THEN
    RETURN left(postal_code, 3);
  END IF;
  
  -- Standard: first 2 digits
  RETURN left(postal_code, 2);
END;
$$;

-- Trigger to auto-update department_code
CREATE OR REPLACE FUNCTION public.update_site_department_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.department_code := derive_department_code(NEW.postal_code);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sites_department_code ON public.sites;
CREATE TRIGGER trg_sites_department_code
  BEFORE INSERT OR UPDATE OF postal_code ON public.sites
  FOR EACH ROW
  EXECUTE FUNCTION update_site_department_code();

-- Update existing sites
UPDATE public.sites 
SET department_code = derive_department_code(postal_code)
WHERE postal_code IS NOT NULL AND department_code IS NULL;

-- =============================================
-- RPC FUNCTIONS FOR PLATFORM ADMIN
-- =============================================

-- Platform admin stats overview
CREATE OR REPLACE FUNCTION public.rpc_platform_admin_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  SELECT json_build_object(
    'total_users', (SELECT count(*) FROM profiles),
    'total_sites', (SELECT count(*) FROM sites WHERE NOT is_demo),
    'total_demo_sites', (SELECT count(*) FROM sites WHERE is_demo),
    'active_subscriptions', (SELECT count(*) FROM subscriptions WHERE status = 'active'),
    'trial_subscriptions', (SELECT count(*) FROM subscriptions WHERE plan_type = 'trial' AND status = 'active'),
    'expired_subscriptions', (SELECT count(*) FROM subscriptions WHERE status IN ('expired', 'canceled')),
    'total_departments', (SELECT count(DISTINCT department_code) FROM sites WHERE department_code IS NOT NULL AND NOT is_demo),
    'total_regions', (SELECT count(DISTINCT g.region_code) FROM sites s JOIN fr_geo_regions g ON s.department_code = g.department_code WHERE NOT s.is_demo)
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Platform admin users list
CREATE OR REPLACE FUNCTION public.rpc_platform_admin_users(
  p_limit int DEFAULT 100,
  p_offset int DEFAULT 0,
  p_search text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  SELECT json_build_object(
    'total', (
      SELECT count(*) FROM profiles p
      WHERE p_search IS NULL OR p.email ILIKE '%' || p_search || '%' OR p.company_name ILIKE '%' || p_search || '%'
    ),
    'users', (
      SELECT json_agg(row_to_json(u)) FROM (
        SELECT 
          p.id,
          p.email,
          p.first_name,
          p.last_name,
          p.company_name,
          p.created_at,
          (SELECT count(*) FROM sites WHERE user_id = p.id AND NOT is_demo) as site_count,
          s.plan_type,
          s.status as subscription_status,
          s.trial_end_date,
          s.current_period_end
        FROM profiles p
        LEFT JOIN subscriptions s ON s.user_id = p.id
        WHERE p_search IS NULL OR p.email ILIKE '%' || p_search || '%' OR p.company_name ILIKE '%' || p_search || '%'
        ORDER BY p.created_at DESC
        LIMIT p_limit OFFSET p_offset
      ) u
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Platform admin sites list
CREATE OR REPLACE FUNCTION public.rpc_platform_admin_sites(
  p_limit int DEFAULT 100,
  p_offset int DEFAULT 0,
  p_search text DEFAULT NULL,
  p_department text DEFAULT NULL,
  p_region text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  SELECT json_build_object(
    'total', (
      SELECT count(*) FROM sites s
      LEFT JOIN fr_geo_regions g ON s.department_code = g.department_code
      WHERE NOT s.is_demo
        AND (p_search IS NULL OR s.name ILIKE '%' || p_search || '%' OR s.city ILIKE '%' || p_search || '%')
        AND (p_department IS NULL OR s.department_code = p_department)
        AND (p_region IS NULL OR g.region_code = p_region)
    ),
    'sites', (
      SELECT json_agg(row_to_json(st)) FROM (
        SELECT 
          s.id,
          s.name,
          s.address,
          s.city,
          s.postal_code,
          s.department_code,
          g.department_name,
          g.region_code,
          g.region_name,
          s.created_at,
          s.user_id,
          p.email as owner_email,
          p.company_name as owner_company
        FROM sites s
        LEFT JOIN fr_geo_regions g ON s.department_code = g.department_code
        LEFT JOIN profiles p ON s.user_id = p.id
        WHERE NOT s.is_demo
          AND (p_search IS NULL OR s.name ILIKE '%' || p_search || '%' OR s.city ILIKE '%' || p_search || '%')
          AND (p_department IS NULL OR s.department_code = p_department)
          AND (p_region IS NULL OR g.region_code = p_region)
        ORDER BY s.created_at DESC
        LIMIT p_limit OFFSET p_offset
      ) st
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Platform admin billing/sales list
CREATE OR REPLACE FUNCTION public.rpc_platform_admin_billing(
  p_limit int DEFAULT 100,
  p_offset int DEFAULT 0,
  p_status text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  IF NOT is_platform_billing() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  SELECT json_build_object(
    'total', (
      SELECT count(*) FROM subscriptions s
      WHERE p_status IS NULL OR s.status = p_status
    ),
    'subscriptions', (
      SELECT json_agg(row_to_json(sub)) FROM (
        SELECT 
          s.id,
          s.user_id,
          p.email,
          p.company_name,
          s.plan_type,
          s.status,
          s.trial_start_date,
          s.trial_end_date,
          s.subscription_start_date,
          s.subscription_end_date,
          s.current_period_end,
          s.stripe_customer_id,
          s.stripe_subscription_id,
          s.last_invoice_url,
          s.laundry_count,
          s.created_at
        FROM subscriptions s
        LEFT JOIN profiles p ON s.user_id = p.id
        WHERE p_status IS NULL OR s.status = p_status
        ORDER BY s.created_at DESC
        LIMIT p_limit OFFSET p_offset
      ) sub
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Platform admin geo stats (with k-anonymity threshold)
CREATE OR REPLACE FUNCTION public.rpc_platform_admin_geo(
  p_min_sites int DEFAULT 5
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  SELECT json_build_object(
    'by_region', (
      SELECT json_agg(row_to_json(r)) FROM (
        SELECT 
          g.region_code,
          g.region_name,
          count(*) as site_count
        FROM sites s
        JOIN fr_geo_regions g ON s.department_code = g.department_code
        WHERE NOT s.is_demo
        GROUP BY g.region_code, g.region_name
        HAVING count(*) >= p_min_sites
        ORDER BY count(*) DESC
      ) r
    ),
    'by_department', (
      SELECT json_agg(row_to_json(d)) FROM (
        SELECT 
          g.department_code,
          g.department_name,
          g.region_name,
          count(*) as site_count
        FROM sites s
        JOIN fr_geo_regions g ON s.department_code = g.department_code
        WHERE NOT s.is_demo
        GROUP BY g.department_code, g.department_name, g.region_name
        HAVING count(*) >= p_min_sites
        ORDER BY count(*) DESC
      ) d
    ),
    'top_cities', (
      SELECT json_agg(row_to_json(c)) FROM (
        SELECT 
          s.city,
          s.department_code,
          count(*) as site_count
        FROM sites s
        WHERE NOT s.is_demo AND s.city IS NOT NULL
        GROUP BY s.city, s.department_code
        HAVING count(*) >= p_min_sites
        ORDER BY count(*) DESC
        LIMIT 20
      ) c
    ),
    'hidden_count', (
      SELECT count(*) FROM (
        SELECT s.department_code
        FROM sites s
        WHERE NOT s.is_demo
        GROUP BY s.department_code
        HAVING count(*) < p_min_sites
      ) hidden
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Grant platform role (only super_admin can use)
CREATE OR REPLACE FUNCTION public.grant_platform_role(
  p_email text,
  p_role platform_role
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF NOT is_platform_super_admin() THEN
    RAISE EXCEPTION 'Unauthorized - super_admin only';
  END IF;
  
  -- Find user by email
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Upsert role
  INSERT INTO platform_roles (user_id, role, created_by)
  VALUES (v_user_id, p_role, auth.uid())
  ON CONFLICT (user_id) DO UPDATE SET role = p_role;
  
  RETURN json_build_object('success', true, 'user_id', v_user_id);
END;
$$;

-- =============================================
-- SEED SUPER ADMINS (will run on migration)
-- =============================================

-- Insert super_admin roles for the specified emails
-- This uses a DO block to handle cases where users might not exist yet
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- yohana@lavcom.fr
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'yohana@lavcom.fr';
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.platform_roles (user_id, role)
    VALUES (v_user_id, 'super_admin')
    ON CONFLICT (user_id) DO UPDATE SET role = 'super_admin';
  END IF;
  
  -- rnaranjoromero@gmail.com
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'rnaranjoromero@gmail.com';
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.platform_roles (user_id, role)
    VALUES (v_user_id, 'super_admin')
    ON CONFLICT (user_id) DO UPDATE SET role = 'super_admin';
  END IF;
END;
$$;