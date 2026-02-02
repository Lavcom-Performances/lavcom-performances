-- Fix grant_platform_role to use profiles instead of auth.users
-- This prevents "permission denied for table users" errors from client-side calls

CREATE OR REPLACE FUNCTION public.grant_platform_role(p_email text, p_role platform_role)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Check authorization: only super_admin can grant roles
  IF NOT is_platform_super_admin() THEN
    RAISE EXCEPTION 'Unauthorized - super_admin only';
  END IF;
  
  -- Find user by email in profiles table (not auth.users)
  SELECT id INTO v_user_id FROM public.profiles WHERE email = p_email;
  
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