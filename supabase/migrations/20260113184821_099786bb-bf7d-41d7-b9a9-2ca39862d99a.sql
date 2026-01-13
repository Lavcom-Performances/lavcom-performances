-- Create helper function to check company admin role
CREATE OR REPLACE FUNCTION public.is_company_admin(_org_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND organization_id = _org_id
      AND role IN ('super_admin'::app_role, 'company_admin'::app_role)
  )
$$;

-- Add comment to document role separation
COMMENT ON TYPE public.app_role IS 'Enterprise roles: super_admin (org owner), company_admin (org manager), checker, user, guest. NOTE: "admin" is DEPRECATED - use company_admin. Platform roles are in platform_roles table.';