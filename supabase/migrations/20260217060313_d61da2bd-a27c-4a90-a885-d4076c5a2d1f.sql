
-- 1) Create paywall bypass allowlist table
CREATE TABLE public.paywall_bypass_allowlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS (no direct client access - only via SECURITY DEFINER RPC)
ALTER TABLE public.paywall_bypass_allowlist ENABLE ROW LEVEL SECURITY;

-- Only platform admins can read it directly (optional safety net)
CREATE POLICY "Platform admins can read bypass list"
ON public.paywall_bypass_allowlist
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.platform_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

-- 2) Insert Rita's row
INSERT INTO public.paywall_bypass_allowlist (email, reason)
VALUES ('rita.verissimo.h@gmail.com', 'Internal bypass');

-- 3) Create SECURITY DEFINER RPC
CREATE OR REPLACE FUNCTION public.rpc_has_paywall_bypass()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
BEGIN
  -- Get current user email from profiles
  SELECT email INTO v_email
  FROM profiles
  WHERE id = auth.uid();

  IF v_email IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM paywall_bypass_allowlist
    WHERE lower(email) = lower(v_email)
  );
END;
$$;

-- 4) Update rpc_has_fin_access to check bypass FIRST
CREATE OR REPLACE FUNCTION public.rpc_has_fin_access()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace RECORD;
  v_project_count INT;
  v_bypass BOOLEAN;
BEGIN
  -- Check paywall bypass FIRST
  v_bypass := rpc_has_paywall_bypass();
  IF v_bypass THEN
    -- Still need a workspace, create one if missing
    SELECT * INTO v_workspace
    FROM fin_workspaces
    WHERE owner_user_id = auth.uid();
    
    IF v_workspace.id IS NULL THEN
      INSERT INTO fin_workspaces (owner_user_id, max_projects, max_scenarios_per_project, plan_code)
      VALUES (auth.uid(), 999, 999, 'paywall_bypass')
      RETURNING * INTO v_workspace;
    END IF;
    
    SELECT COUNT(*) INTO v_project_count FROM fin_projects WHERE workspace_id = v_workspace.id;
    
    RETURN jsonb_build_object(
      'has_access', true,
      'reason', 'paywall_bypass',
      'workspace_id', v_workspace.id,
      'max_projects', 999,
      'max_scenarios', 999,
      'current_projects', v_project_count,
      'can_create_project', true,
      'plan_code', 'paywall_bypass',
      'is_platform_bypass', true
    );
  END IF;

  -- Normal flow
  SELECT * INTO v_workspace
  FROM fin_workspaces
  WHERE owner_user_id = auth.uid();
  
  IF v_workspace.id IS NULL THEN
    RETURN jsonb_build_object('has_access', false, 'reason', 'no_workspace');
  END IF;
  
  IF v_workspace.access_ends_at IS NOT NULL AND v_workspace.access_ends_at < now() THEN
    RETURN jsonb_build_object(
      'has_access', false, 'reason', 'expired',
      'expired_at', v_workspace.access_ends_at, 'read_only', true
    );
  END IF;
  
  SELECT COUNT(*) INTO v_project_count FROM fin_projects WHERE workspace_id = v_workspace.id;
  
  RETURN jsonb_build_object(
    'has_access', true,
    'workspace_id', v_workspace.id,
    'access_ends_at', v_workspace.access_ends_at,
    'max_projects', v_workspace.max_projects,
    'max_scenarios', v_workspace.max_scenarios_per_project,
    'current_projects', v_project_count,
    'can_create_project', v_project_count < v_workspace.max_projects,
    'plan_code', v_workspace.plan_code
  );
END;
$$;
