
-- TAEX-304: Data Protection & Performance Hardening
-- A. SOFT-DELETE COLUMNS (no hard DELETE on business-critical tables)

-- Add soft-delete columns to operations
ALTER TABLE public.operations 
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deleted_by uuid DEFAULT NULL;

-- Add soft-delete columns to fin_projects
ALTER TABLE public.fin_projects 
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deleted_by uuid DEFAULT NULL;

-- Add soft-delete columns to fin_line_items  
ALTER TABLE public.fin_line_items 
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deleted_by uuid DEFAULT NULL;

-- Add soft-delete columns to fin_hypotheses
ALTER TABLE public.fin_hypotheses 
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deleted_by uuid DEFAULT NULL;

-- Add soft-delete columns to organizations
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deleted_by uuid DEFAULT NULL;

-- Sites already has status column, add archived_at for explicit soft-delete tracking
ALTER TABLE public.sites 
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deleted_by uuid DEFAULT NULL;

-- Add soft-delete to import_batches
ALTER TABLE public.import_batches 
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deleted_by uuid DEFAULT NULL;

-- B. PERFORMANCE INDEXES

-- Operations indexes for high-volume queries
CREATE INDEX IF NOT EXISTS idx_operations_site_date ON public.operations(site_id, operation_date DESC);
CREATE INDEX IF NOT EXISTS idx_operations_user_site ON public.operations(user_id, site_id);
CREATE INDEX IF NOT EXISTS idx_operations_deleted ON public.operations(deleted_at) WHERE deleted_at IS NULL;

-- Trust tables indexes
CREATE INDEX IF NOT EXISTS idx_trust_day_company ON public.trust_day(company_id, day DESC);
CREATE INDEX IF NOT EXISTS idx_trust_import_company ON public.trust_import(company_id, created_at DESC);

-- Financial projection indexes
CREATE INDEX IF NOT EXISTS idx_fin_projects_workspace ON public.fin_projects(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fin_projects_deleted ON public.fin_projects(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fin_line_items_project ON public.fin_line_items(project_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_fin_hypotheses_project ON public.fin_hypotheses(project_id, category);

-- System events indexes for observability (using existing columns)
CREATE INDEX IF NOT EXISTS idx_system_events_created ON public.system_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_events_severity ON public.system_events(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_events_source ON public.system_events(source, created_at DESC);

-- Export jobs indexes
CREATE INDEX IF NOT EXISTS idx_export_jobs_created_by ON public.export_jobs(created_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_export_jobs_status ON public.export_jobs(status, created_at DESC);

-- Audit logs index
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id, created_at DESC);

-- C. UPDATE RLS POLICIES TO EXCLUDE SOFT-DELETED RECORDS

-- Drop and recreate operations SELECT policy to exclude deleted
DROP POLICY IF EXISTS "Users can view their own operations" ON public.operations;
CREATE POLICY "Users can view their own operations" ON public.operations
FOR SELECT USING (
  (auth.uid() = user_id) 
  AND owns_site(site_id) 
  AND deleted_at IS NULL
);

-- Drop and recreate fin_projects SELECT policy
DROP POLICY IF EXISTS "Users can view their fin_projects" ON public.fin_projects;
CREATE POLICY "Users can view their fin_projects" ON public.fin_projects
FOR SELECT USING (
  owns_fin_workspace(workspace_id) 
  AND deleted_at IS NULL
);

-- Drop and recreate fin_line_items SELECT policy
DROP POLICY IF EXISTS "Users can view their fin_line_items" ON public.fin_line_items;
CREATE POLICY "Users can view their fin_line_items" ON public.fin_line_items
FOR SELECT USING (
  owns_fin_project(project_id) 
  AND deleted_at IS NULL
);

-- Drop and recreate fin_hypotheses SELECT policy
DROP POLICY IF EXISTS "Users can view their fin_hypotheses" ON public.fin_hypotheses;
CREATE POLICY "Users can view their fin_hypotheses" ON public.fin_hypotheses
FOR SELECT USING (
  owns_fin_project(project_id) 
  AND deleted_at IS NULL
);

-- D. HELPER FUNCTIONS FOR SOFT-DELETE

-- Function to soft-delete an operation
CREATE OR REPLACE FUNCTION public.soft_delete_operation(operation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.operations 
  SET deleted_at = now(), deleted_by = auth.uid()
  WHERE id = operation_id 
    AND user_id = auth.uid()
    AND deleted_at IS NULL;
END;
$$;

-- Function to soft-delete a fin_project
CREATE OR REPLACE FUNCTION public.soft_delete_fin_project(p_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Soft-delete the project
  UPDATE public.fin_projects 
  SET deleted_at = now(), deleted_by = auth.uid()
  WHERE id = p_project_id 
    AND deleted_at IS NULL
    AND owns_fin_workspace(workspace_id);
  
  -- Soft-delete related line items
  UPDATE public.fin_line_items 
  SET deleted_at = now(), deleted_by = auth.uid()
  WHERE project_id = p_project_id 
    AND deleted_at IS NULL;
  
  -- Soft-delete related hypotheses
  UPDATE public.fin_hypotheses 
  SET deleted_at = now(), deleted_by = auth.uid()
  WHERE project_id = p_project_id 
    AND deleted_at IS NULL;
END;
$$;

-- Function to restore a soft-deleted fin_project
CREATE OR REPLACE FUNCTION public.restore_fin_project(p_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Restore the project
  UPDATE public.fin_projects 
  SET deleted_at = NULL, deleted_by = NULL
  WHERE id = p_project_id 
    AND deleted_at IS NOT NULL
    AND owns_fin_workspace(workspace_id);
  
  -- Restore related line items
  UPDATE public.fin_line_items 
  SET deleted_at = NULL, deleted_by = NULL
  WHERE project_id = p_project_id;
  
  -- Restore related hypotheses
  UPDATE public.fin_hypotheses 
  SET deleted_at = NULL, deleted_by = NULL
  WHERE project_id = p_project_id;
END;
$$;

-- E. COMMENT FOR DOCUMENTATION
COMMENT ON COLUMN public.operations.deleted_at IS 'Soft-delete timestamp (TAEX-304). NULL = active record.';
COMMENT ON COLUMN public.fin_projects.deleted_at IS 'Soft-delete timestamp (TAEX-304). NULL = active record.';
COMMENT ON COLUMN public.fin_line_items.deleted_at IS 'Soft-delete timestamp (TAEX-304). NULL = active record.';
COMMENT ON COLUMN public.organizations.deleted_at IS 'Soft-delete timestamp (TAEX-304). NULL = active record.';
COMMENT ON COLUMN public.sites.deleted_at IS 'Soft-delete timestamp (TAEX-304). NULL = active record.';
