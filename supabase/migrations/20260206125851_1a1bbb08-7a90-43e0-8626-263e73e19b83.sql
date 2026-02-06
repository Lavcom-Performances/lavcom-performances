-- ==============================================
-- TAEX-303A: Financial Projection Tool Schema
-- Uses "fin_" prefix to avoid conflicts with simulator "projects" table
-- ==============================================

-- Project status enum
CREATE TYPE public.fin_project_status AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- Hypothesis category enum
CREATE TYPE public.fin_hypothesis_category AS ENUM ('INVESTMENT', 'REVENUE', 'COST', 'FINANCING');

-- Export format enum  
CREATE TYPE public.fin_export_format AS ENUM ('PDF', 'XLSX');

-- Export status enum
CREATE TYPE public.fin_export_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- ==============================================
-- CORE TABLES
-- ==============================================

-- Financial projection workspaces (one per user, created on pack purchase)
CREATE TABLE public.fin_workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_ends_at TIMESTAMPTZ,
  max_projects INT NOT NULL DEFAULT 1,
  max_scenarios_per_project INT NOT NULL DEFAULT 1,
  plan_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(owner_user_id)
);

-- Financial projection projects
CREATE TABLE public.fin_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.fin_workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  project_type TEXT NOT NULL DEFAULT 'creation', -- creation, reprise, extension
  status fin_project_status NOT NULL DEFAULT 'DRAFT',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Versioned hypotheses for each project
CREATE TABLE public.fin_hypotheses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.fin_projects(id) ON DELETE CASCADE,
  category fin_hypothesis_category NOT NULL,
  key TEXT NOT NULL,
  value NUMERIC NOT NULL,
  label TEXT,
  unit TEXT,
  meta JSONB DEFAULT '{}'::jsonb,
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Scenarios for comparison
CREATE TABLE public.fin_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.fin_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_baseline BOOLEAN NOT NULL DEFAULT false,
  hypotheses_override JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Computed forecasts (cached results)
CREATE TABLE public.fin_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.fin_projects(id) ON DELETE CASCADE,
  scenario_id UUID REFERENCES public.fin_scenarios(id) ON DELETE CASCADE,
  year INT NOT NULL CHECK (year >= 1 AND year <= 5),
  month INT NOT NULL CHECK (month >= 1 AND month <= 12),
  revenue NUMERIC NOT NULL DEFAULT 0,
  costs NUMERIC NOT NULL DEFAULT 0,
  ebitda NUMERIC NOT NULL DEFAULT 0,
  cashflow NUMERIC NOT NULL DEFAULT 0,
  depreciation NUMERIC NOT NULL DEFAULT 0,
  net_income NUMERIC NOT NULL DEFAULT 0,
  cumulative_cashflow NUMERIC NOT NULL DEFAULT 0,
  hypothesis_version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, scenario_id, year, month)
);

-- Export history
CREATE TABLE public.fin_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.fin_projects(id) ON DELETE CASCADE,
  format fin_export_format NOT NULL,
  status fin_export_status NOT NULL DEFAULT 'PENDING',
  file_path TEXT,
  file_name TEXT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Hypothesis snapshots for audit trail
CREATE TABLE public.fin_hypothesis_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.fin_projects(id) ON DELETE CASCADE,
  version INT NOT NULL,
  snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- ==============================================
-- INDEXES
-- ==============================================

CREATE INDEX idx_fin_projects_workspace ON public.fin_projects(workspace_id);
CREATE INDEX idx_fin_hypotheses_project ON public.fin_hypotheses(project_id);
CREATE INDEX idx_fin_scenarios_project ON public.fin_scenarios(project_id);
CREATE INDEX idx_fin_forecasts_project ON public.fin_forecasts(project_id);
CREATE INDEX idx_fin_forecasts_scenario ON public.fin_forecasts(scenario_id);
CREATE INDEX idx_fin_exports_project ON public.fin_exports(project_id);

-- ==============================================
-- RLS POLICIES
-- ==============================================

ALTER TABLE public.fin_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_hypotheses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_hypothesis_snapshots ENABLE ROW LEVEL SECURITY;

-- Helper function to check workspace ownership
CREATE OR REPLACE FUNCTION public.owns_fin_workspace(ws_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.fin_workspaces
    WHERE id = ws_id AND owner_user_id = auth.uid()
  )
$$;

-- Helper function to check project ownership via workspace
CREATE OR REPLACE FUNCTION public.owns_fin_project(proj_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.fin_projects p
    JOIN public.fin_workspaces w ON p.workspace_id = w.id
    WHERE p.id = proj_id AND w.owner_user_id = auth.uid()
  )
$$;

-- Workspace policies
CREATE POLICY "Users can view their own fin_workspaces"
  ON public.fin_workspaces FOR SELECT
  USING (owner_user_id = auth.uid());

CREATE POLICY "Users can update their own fin_workspaces"
  ON public.fin_workspaces FOR UPDATE
  USING (owner_user_id = auth.uid());

CREATE POLICY "Service role can manage fin_workspaces"
  ON public.fin_workspaces FOR ALL
  USING (true)
  WITH CHECK (true);

-- Project policies  
CREATE POLICY "Users can view their own fin_projects"
  ON public.fin_projects FOR SELECT
  USING (owns_fin_workspace(workspace_id));

CREATE POLICY "Users can create fin_projects in their workspaces"
  ON public.fin_projects FOR INSERT
  WITH CHECK (owns_fin_workspace(workspace_id));

CREATE POLICY "Users can update their own fin_projects"
  ON public.fin_projects FOR UPDATE
  USING (owns_fin_workspace(workspace_id));

CREATE POLICY "Users can delete their own fin_projects"
  ON public.fin_projects FOR DELETE
  USING (owns_fin_workspace(workspace_id));

-- Hypothesis policies
CREATE POLICY "Users can view their fin_hypotheses"
  ON public.fin_hypotheses FOR SELECT
  USING (owns_fin_project(project_id));

CREATE POLICY "Users can create fin_hypotheses"
  ON public.fin_hypotheses FOR INSERT
  WITH CHECK (owns_fin_project(project_id));

CREATE POLICY "Users can update their fin_hypotheses"
  ON public.fin_hypotheses FOR UPDATE
  USING (owns_fin_project(project_id));

CREATE POLICY "Users can delete their fin_hypotheses"
  ON public.fin_hypotheses FOR DELETE
  USING (owns_fin_project(project_id));

-- Scenario policies
CREATE POLICY "Users can view their fin_scenarios"
  ON public.fin_scenarios FOR SELECT
  USING (owns_fin_project(project_id));

CREATE POLICY "Users can create fin_scenarios"
  ON public.fin_scenarios FOR INSERT
  WITH CHECK (owns_fin_project(project_id));

CREATE POLICY "Users can update their fin_scenarios"
  ON public.fin_scenarios FOR UPDATE
  USING (owns_fin_project(project_id));

CREATE POLICY "Users can delete their fin_scenarios"
  ON public.fin_scenarios FOR DELETE
  USING (owns_fin_project(project_id));

-- Forecast policies
CREATE POLICY "Users can view their fin_forecasts"
  ON public.fin_forecasts FOR SELECT
  USING (owns_fin_project(project_id));

CREATE POLICY "Users can manage their fin_forecasts"
  ON public.fin_forecasts FOR ALL
  USING (owns_fin_project(project_id))
  WITH CHECK (owns_fin_project(project_id));

-- Export policies
CREATE POLICY "Users can view their fin_exports"
  ON public.fin_exports FOR SELECT
  USING (owns_fin_project(project_id));

CREATE POLICY "Users can create fin_exports"
  ON public.fin_exports FOR INSERT
  WITH CHECK (owns_fin_project(project_id));

CREATE POLICY "Users can update their fin_exports"
  ON public.fin_exports FOR UPDATE
  USING (owns_fin_project(project_id));

-- Snapshot policies
CREATE POLICY "Users can view their fin_hypothesis_snapshots"
  ON public.fin_hypothesis_snapshots FOR SELECT
  USING (owns_fin_project(project_id));

CREATE POLICY "Users can create fin_hypothesis_snapshots"
  ON public.fin_hypothesis_snapshots FOR INSERT
  WITH CHECK (owns_fin_project(project_id));

-- ==============================================
-- HELPER RPCs
-- ==============================================

-- Get or create workspace for current user
CREATE OR REPLACE FUNCTION public.rpc_get_or_create_fin_workspace(
  p_plan_code TEXT DEFAULT 'essential',
  p_max_projects INT DEFAULT 1,
  p_max_scenarios INT DEFAULT 1,
  p_access_days INT DEFAULT 30
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id UUID;
  v_user_id UUID := auth.uid();
BEGIN
  SELECT id INTO v_workspace_id
  FROM fin_workspaces
  WHERE owner_user_id = v_user_id;
  
  IF v_workspace_id IS NULL THEN
    INSERT INTO fin_workspaces (
      owner_user_id, access_ends_at, max_projects, max_scenarios_per_project, plan_code
    ) VALUES (
      v_user_id,
      now() + (p_access_days || ' days')::interval,
      p_max_projects,
      p_max_scenarios,
      p_plan_code
    )
    RETURNING id INTO v_workspace_id;
  END IF;
  
  RETURN v_workspace_id;
END;
$$;

-- Check if user has active project access
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
BEGIN
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

-- Compute project forecast (main calculation engine)
CREATE OR REPLACE FUNCTION public.rpc_compute_fin_forecast(
  p_project_id UUID,
  p_scenario_id UUID DEFAULT NULL,
  p_horizon_years INT DEFAULT 3
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hypotheses JSONB;
  v_year INT;
  v_month INT;
  v_revenue NUMERIC;
  v_costs NUMERIC;
  v_ebitda NUMERIC;
  v_cashflow NUMERIC;
  v_cumulative NUMERIC := 0;
  v_depreciation NUMERIC;
  v_net_income NUMERIC;
  v_hyp_version INT;
  v_monthly_revenue NUMERIC;
  v_fixed_costs NUMERIC;
  v_variable_cost_rate NUMERIC;
  v_growth_rate NUMERIC;
  v_initial_investment NUMERIC;
  v_depreciation_years INT;
  v_loan_amount NUMERIC;
  v_loan_rate NUMERIC;
  v_loan_years INT;
  v_seasonality JSONB;
  v_forecast_count INT := 0;
BEGIN
  IF NOT owns_fin_project(p_project_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  SELECT COALESCE(MAX(version), 1) INTO v_hyp_version
  FROM fin_hypotheses WHERE project_id = p_project_id;
  
  SELECT jsonb_object_agg(key, value) INTO v_hypotheses
  FROM fin_hypotheses WHERE project_id = p_project_id;
  
  IF p_scenario_id IS NOT NULL THEN
    SELECT COALESCE(v_hypotheses, '{}'::jsonb) || COALESCE(hypotheses_override, '{}'::jsonb) INTO v_hypotheses
    FROM fin_scenarios WHERE id = p_scenario_id AND project_id = p_project_id;
  END IF;
  
  v_monthly_revenue := COALESCE((v_hypotheses->>'monthly_revenue')::numeric, 5000);
  v_fixed_costs := COALESCE((v_hypotheses->>'fixed_costs')::numeric, 2000);
  v_variable_cost_rate := COALESCE((v_hypotheses->>'variable_cost_rate')::numeric, 0.15);
  v_growth_rate := COALESCE((v_hypotheses->>'annual_growth_rate')::numeric, 0.05);
  v_initial_investment := COALESCE((v_hypotheses->>'initial_investment')::numeric, 50000);
  v_depreciation_years := COALESCE((v_hypotheses->>'depreciation_years')::int, 7);
  v_loan_amount := COALESCE((v_hypotheses->>'loan_amount')::numeric, 0);
  v_loan_rate := COALESCE((v_hypotheses->>'loan_rate')::numeric, 0.04);
  v_loan_years := COALESCE((v_hypotheses->>'loan_years')::int, 7);
  v_seasonality := COALESCE(v_hypotheses->'seasonality', 
    '[1.0, 0.9, 0.95, 1.0, 1.05, 1.1, 0.85, 0.8, 1.0, 1.05, 1.0, 1.1]'::jsonb);
  
  v_depreciation := v_initial_investment / GREATEST(v_depreciation_years, 1) / 12;
  
  DELETE FROM fin_forecasts
  WHERE project_id = p_project_id
    AND (scenario_id = p_scenario_id OR (p_scenario_id IS NULL AND scenario_id IS NULL));
  
  FOR v_year IN 1..p_horizon_years LOOP
    FOR v_month IN 1..12 LOOP
      v_revenue := v_monthly_revenue 
        * POWER(1 + v_growth_rate, v_year - 1)
        * COALESCE((v_seasonality->(v_month - 1))::numeric, 1.0);
      
      v_costs := v_fixed_costs + (v_revenue * v_variable_cost_rate);
      v_ebitda := v_revenue - v_costs;
      v_net_income := v_ebitda - v_depreciation;
      
      IF v_loan_amount > 0 AND v_year <= v_loan_years THEN
        v_net_income := v_net_income - (v_loan_amount * v_loan_rate / 12);
      END IF;
      
      v_cashflow := v_ebitda;
      IF v_loan_amount > 0 AND v_year <= v_loan_years THEN
        v_cashflow := v_cashflow - (v_loan_amount / v_loan_years / 12);
      END IF;
      
      IF v_year = 1 AND v_month = 1 THEN
        v_cashflow := v_cashflow - v_initial_investment + v_loan_amount;
      END IF;
      
      v_cumulative := v_cumulative + v_cashflow;
      
      INSERT INTO fin_forecasts (
        project_id, scenario_id, year, month,
        revenue, costs, ebitda, cashflow, 
        depreciation, net_income, cumulative_cashflow,
        hypothesis_version
      ) VALUES (
        p_project_id, p_scenario_id, v_year, v_month,
        ROUND(v_revenue, 2), ROUND(v_costs, 2), ROUND(v_ebitda, 2), ROUND(v_cashflow, 2),
        ROUND(v_depreciation, 2), ROUND(v_net_income, 2), ROUND(v_cumulative, 2),
        v_hyp_version
      );
      
      v_forecast_count := v_forecast_count + 1;
    END LOOP;
  END LOOP;
  
  INSERT INTO system_events (source, event_type, severity, payload)
  VALUES ('fin_project', 'forecast_computed', 'info', jsonb_build_object(
    'project_id', p_project_id, 'scenario_id', p_scenario_id,
    'horizon_years', p_horizon_years, 'hypothesis_version', v_hyp_version
  ));
  
  RETURN jsonb_build_object(
    'success', true, 'project_id', p_project_id, 'scenario_id', p_scenario_id,
    'horizon_years', p_horizon_years, 'hypothesis_version', v_hyp_version,
    'forecast_count', v_forecast_count
  );
END;
$$;

-- Save hypothesis snapshot
CREATE OR REPLACE FUNCTION public.rpc_save_fin_snapshot(p_project_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_version INT;
  v_snapshot JSONB;
BEGIN
  IF NOT owns_fin_project(p_project_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  SELECT COALESCE(MAX(version), 0) + 1 INTO v_version
  FROM fin_hypothesis_snapshots WHERE project_id = p_project_id;
  
  SELECT jsonb_agg(jsonb_build_object(
    'category', category, 'key', key, 'value', value,
    'label', label, 'unit', unit, 'meta', meta
  )) INTO v_snapshot FROM fin_hypotheses WHERE project_id = p_project_id;
  
  INSERT INTO fin_hypothesis_snapshots (project_id, version, snapshot, created_by)
  VALUES (p_project_id, v_version, COALESCE(v_snapshot, '[]'::jsonb), auth.uid());
  
  UPDATE fin_hypotheses SET version = v_version, updated_at = now()
  WHERE project_id = p_project_id;
  
  RETURN v_version;
END;
$$;

-- Convert project to operations site
CREATE OR REPLACE FUNCTION public.rpc_convert_fin_to_operations(
  p_project_id UUID,
  p_site_name TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_project RECORD;
  v_site_id UUID;
BEGIN
  IF NOT owns_fin_project(p_project_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  SELECT * INTO v_project FROM fin_projects WHERE id = p_project_id;
  IF v_project.id IS NULL THEN RAISE EXCEPTION 'Project not found'; END IF;
  
  INSERT INTO sites (user_id, name, status)
  VALUES (v_user_id, COALESCE(p_site_name, v_project.name), 'active')
  RETURNING id INTO v_site_id;
  
  UPDATE fin_projects SET status = 'ARCHIVED', updated_at = now() WHERE id = p_project_id;
  
  INSERT INTO system_events (source, event_type, severity, payload)
  VALUES ('fin_project', 'project_converted_to_operations', 'info', jsonb_build_object(
    'project_id', p_project_id, 'project_name', v_project.name,
    'site_id', v_site_id, 'user_id', v_user_id
  ));
  
  RETURN v_site_id;
END;
$$;

-- Get project summary for exports
CREATE OR REPLACE FUNCTION public.rpc_get_fin_export_data(p_project_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project RECORD;
  v_hypotheses JSONB;
  v_forecasts JSONB;
  v_annual_summary JSONB;
BEGIN
  IF NOT owns_fin_project(p_project_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  SELECT * INTO v_project FROM fin_projects WHERE id = p_project_id;
  
  SELECT jsonb_agg(jsonb_build_object(
    'category', category, 'key', key, 'value', value, 'label', label, 'unit', unit
  )) INTO v_hypotheses FROM fin_hypotheses WHERE project_id = p_project_id;
  
  SELECT jsonb_agg(jsonb_build_object(
    'year', year, 'month', month, 'revenue', revenue, 'costs', costs,
    'ebitda', ebitda, 'cashflow', cashflow, 'cumulative_cashflow', cumulative_cashflow
  ) ORDER BY year, month) INTO v_forecasts
  FROM fin_forecasts WHERE project_id = p_project_id AND scenario_id IS NULL;
  
  SELECT jsonb_agg(jsonb_build_object(
    'year', year, 'total_revenue', total_revenue, 'total_costs', total_costs,
    'total_ebitda', total_ebitda, 'total_cashflow', total_cashflow, 'final_cumulative', final_cumulative
  ) ORDER BY year) INTO v_annual_summary FROM (
    SELECT year, SUM(revenue) as total_revenue, SUM(costs) as total_costs,
      SUM(ebitda) as total_ebitda, SUM(cashflow) as total_cashflow,
      MAX(cumulative_cashflow) as final_cumulative
    FROM fin_forecasts WHERE project_id = p_project_id AND scenario_id IS NULL GROUP BY year
  ) annual;
  
  RETURN jsonb_build_object(
    'project', jsonb_build_object('id', v_project.id, 'name', v_project.name,
      'type', v_project.project_type, 'status', v_project.status, 'created_at', v_project.created_at),
    'hypotheses', COALESCE(v_hypotheses, '[]'::jsonb),
    'monthly_forecasts', COALESCE(v_forecasts, '[]'::jsonb),
    'annual_summary', COALESCE(v_annual_summary, '[]'::jsonb),
    'exported_at', now()
  );
END;
$$;