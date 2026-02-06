-- =====================================================
-- TAEX-303A: Bank-Grade PDF - Line Items & RPCs
-- =====================================================

-- 1. Create line item category enum
CREATE TYPE fin_line_item_category AS ENUM ('CYCLE', 'PRODUCT', 'OPTION');

-- 2. Create fin_line_items table for machine/service pricing
CREATE TABLE public.fin_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.fin_projects(id) ON DELETE CASCADE,
  scenario_id UUID REFERENCES public.fin_scenarios(id) ON DELETE CASCADE,
  category fin_line_item_category NOT NULL DEFAULT 'CYCLE',
  item_type TEXT NOT NULL, -- e.g., 'Washer', 'Dryer', 'Product', 'Option'
  capacity_kg NUMERIC, -- nullable for non-machine items
  label TEXT NOT NULL,
  code TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  price_ttc_cents INTEGER NOT NULL DEFAULT 0,
  cycles_per_day_per_unit NUMERIC NOT NULL DEFAULT 10,
  open_days_per_month INTEGER NOT NULL DEFAULT 26,
  utilization_rate NUMERIC NOT NULL DEFAULT 0.7 CHECK (utilization_rate >= 0 AND utilization_rate <= 1),
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Add VAT configuration to fin_projects
ALTER TABLE public.fin_projects 
  ADD COLUMN IF NOT EXISTS vat_rate NUMERIC NOT NULL DEFAULT 0.20,
  ADD COLUMN IF NOT EXISTS vat_frequency TEXT NOT NULL DEFAULT 'MONTHLY';

-- 4. Create indexes for performance
CREATE INDEX idx_fin_line_items_project ON public.fin_line_items(project_id);
CREATE INDEX idx_fin_line_items_scenario ON public.fin_line_items(scenario_id);
CREATE INDEX idx_fin_line_items_active ON public.fin_line_items(project_id, is_active);

-- 5. Enable RLS
ALTER TABLE public.fin_line_items ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies - only workspace owners can access
CREATE POLICY "Users can view their fin_line_items"
  ON public.fin_line_items FOR SELECT
  USING (owns_fin_project(project_id));

CREATE POLICY "Users can create fin_line_items"
  ON public.fin_line_items FOR INSERT
  WITH CHECK (owns_fin_project(project_id));

CREATE POLICY "Users can update their fin_line_items"
  ON public.fin_line_items FOR UPDATE
  USING (owns_fin_project(project_id));

CREATE POLICY "Users can delete their fin_line_items"
  ON public.fin_line_items FOR DELETE
  USING (owns_fin_project(project_id));

-- 7. Updated_at trigger
CREATE TRIGGER update_fin_line_items_updated_at
  BEFORE UPDATE ON public.fin_line_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Create RPC for computing line-based revenue
CREATE OR REPLACE FUNCTION public.rpc_compute_line_revenue(
  p_project_id UUID,
  p_scenario_id UUID DEFAULT NULL,
  p_month INTEGER DEFAULT 1,
  p_year INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vat_rate NUMERIC;
  v_result JSONB;
  v_total_ttc NUMERIC := 0;
  v_cycle_ttc NUMERIC := 0;
  v_product_ttc NUMERIC := 0;
  v_option_ttc NUMERIC := 0;
  v_line RECORD;
  v_line_revenue NUMERIC;
BEGIN
  -- Get VAT rate from project
  SELECT vat_rate INTO v_vat_rate FROM fin_projects WHERE id = p_project_id;
  
  -- Calculate revenue from each active line item
  FOR v_line IN 
    SELECT * FROM fin_line_items 
    WHERE project_id = p_project_id 
      AND is_active = true
      AND (scenario_id IS NULL OR scenario_id = p_scenario_id)
    ORDER BY sort_order
  LOOP
    -- line_revenue_ttc = price_ttc * quantity * cycles_per_day_per_unit * open_days_per_month * utilization_rate
    v_line_revenue := (v_line.price_ttc_cents::NUMERIC / 100) 
                      * v_line.quantity 
                      * v_line.cycles_per_day_per_unit 
                      * v_line.open_days_per_month 
                      * v_line.utilization_rate;
    
    v_total_ttc := v_total_ttc + v_line_revenue;
    
    CASE v_line.category
      WHEN 'CYCLE' THEN v_cycle_ttc := v_cycle_ttc + v_line_revenue;
      WHEN 'PRODUCT' THEN v_product_ttc := v_product_ttc + v_line_revenue;
      WHEN 'OPTION' THEN v_option_ttc := v_option_ttc + v_line_revenue;
    END CASE;
  END LOOP;
  
  -- Build result with HT conversions
  v_result := jsonb_build_object(
    'month', p_month,
    'year', p_year,
    'revenue_ttc', ROUND(v_total_ttc, 2),
    'revenue_ht', ROUND(v_total_ttc / (1 + v_vat_rate), 2),
    'vat_collected', ROUND(v_total_ttc * (v_vat_rate / (1 + v_vat_rate)), 2),
    'by_category', jsonb_build_object(
      'cycle_ttc', ROUND(v_cycle_ttc, 2),
      'product_ttc', ROUND(v_product_ttc, 2),
      'option_ttc', ROUND(v_option_ttc, 2)
    ),
    'vat_rate', v_vat_rate
  );
  
  RETURN v_result;
END;
$$;

-- 9. Create RPC for PDF bundle (returns all data needed for bank-grade PDF)
CREATE OR REPLACE FUNCTION public.rpc_get_fin_pdf_bundle(
  p_project_id UUID,
  p_scenario_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project RECORD;
  v_scenario RECORD;
  v_workspace RECORD;
  v_result JSONB;
  v_pnl JSONB;
  v_balance_sheet JSONB;
  v_cash_monthly JSONB;
  v_funding_plan JSONB;
  v_wcr_bfr JSONB;
  v_summary JSONB;
  v_line_items JSONB;
  v_forecasts JSONB;
  v_hypotheses JSONB;
  v_year1_revenue_ttc NUMERIC := 0;
  v_year2_revenue_ttc NUMERIC := 0;
  v_year3_revenue_ttc NUMERIC := 0;
  v_year1_revenue_ht NUMERIC := 0;
  v_year2_revenue_ht NUMERIC := 0;
  v_year3_revenue_ht NUMERIC := 0;
  v_year1_ebitda NUMERIC := 0;
  v_year2_ebitda NUMERIC := 0;
  v_year3_ebitda NUMERIC := 0;
  v_vat_rate NUMERIC;
  v_monthly_data JSONB := '[]'::JSONB;
  v_m INTEGER;
  v_month_rev JSONB;
BEGIN
  -- Get project info
  SELECT * INTO v_project FROM fin_projects WHERE id = p_project_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project not found';
  END IF;
  
  v_vat_rate := COALESCE(v_project.vat_rate, 0.20);
  
  -- Get workspace info
  SELECT * INTO v_workspace FROM fin_workspaces WHERE id = v_project.workspace_id;
  
  -- Get scenario info if provided
  IF p_scenario_id IS NOT NULL THEN
    SELECT * INTO v_scenario FROM fin_scenarios WHERE id = p_scenario_id;
  END IF;
  
  -- Get line items
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', id,
      'category', category::TEXT,
      'item_type', item_type,
      'capacity_kg', capacity_kg,
      'label', label,
      'quantity', quantity,
      'price_ttc_cents', price_ttc_cents,
      'cycles_per_day', cycles_per_day_per_unit,
      'open_days', open_days_per_month,
      'utilization_rate', utilization_rate
    ) ORDER BY sort_order
  ), '[]'::JSONB)
  INTO v_line_items
  FROM fin_line_items 
  WHERE project_id = p_project_id 
    AND is_active = true
    AND (scenario_id IS NULL OR scenario_id = p_scenario_id);
  
  -- Get hypotheses
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'key', key,
      'category', category::TEXT,
      'label', label,
      'value', value,
      'unit', unit,
      'meta', meta
    )
  ), '[]'::JSONB)
  INTO v_hypotheses
  FROM fin_hypotheses
  WHERE project_id = p_project_id;
  
  -- Get forecasts
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'year', year,
      'month', month,
      'revenue', revenue,
      'costs', costs,
      'ebitda', ebitda,
      'cashflow', cashflow,
      'cumulative_cashflow', cumulative_cashflow,
      'depreciation', depreciation,
      'net_income', net_income
    ) ORDER BY year, month
  ), '[]'::JSONB)
  INTO v_forecasts
  FROM fin_forecasts
  WHERE project_id = p_project_id
    AND (scenario_id IS NULL OR scenario_id = p_scenario_id);
  
  -- Calculate yearly totals from forecasts
  SELECT 
    COALESCE(SUM(CASE WHEN year = 1 THEN revenue ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN year = 2 THEN revenue ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN year = 3 THEN revenue ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN year = 1 THEN ebitda ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN year = 2 THEN ebitda ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN year = 3 THEN ebitda ELSE 0 END), 0)
  INTO v_year1_revenue_ht, v_year2_revenue_ht, v_year3_revenue_ht,
       v_year1_ebitda, v_year2_ebitda, v_year3_ebitda
  FROM fin_forecasts
  WHERE project_id = p_project_id
    AND (scenario_id IS NULL OR scenario_id = p_scenario_id);
  
  -- Calculate TTC from HT
  v_year1_revenue_ttc := v_year1_revenue_ht * (1 + v_vat_rate);
  v_year2_revenue_ttc := v_year2_revenue_ht * (1 + v_vat_rate);
  v_year3_revenue_ttc := v_year3_revenue_ht * (1 + v_vat_rate);
  
  -- Build monthly data for year 1 (12 months)
  FOR v_m IN 1..12 LOOP
    v_month_rev := rpc_compute_line_revenue(p_project_id, p_scenario_id, v_m, 1);
    v_monthly_data := v_monthly_data || v_month_rev;
  END LOOP;
  
  -- Build summary
  v_summary := jsonb_build_object(
    'ca_ttc_year1', ROUND(v_year1_revenue_ttc, 2),
    'ca_ht_year1', ROUND(v_year1_revenue_ht, 2),
    'ebitda_year1', ROUND(v_year1_ebitda, 2),
    'vat_rate', v_vat_rate,
    'total_vat_year1', ROUND(v_year1_revenue_ttc - v_year1_revenue_ht, 2)
  );
  
  -- Build P&L structure (simplified - will be enriched in edge function)
  v_pnl := jsonb_build_object(
    'year1', jsonb_build_object('revenue_ht', v_year1_revenue_ht, 'ebitda', v_year1_ebitda),
    'year2', jsonb_build_object('revenue_ht', v_year2_revenue_ht, 'ebitda', v_year2_ebitda),
    'year3', jsonb_build_object('revenue_ht', v_year3_revenue_ht, 'ebitda', v_year3_ebitda)
  );
  
  -- Build final result
  v_result := jsonb_build_object(
    'meta', jsonb_build_object(
      'project_id', p_project_id,
      'project_name', v_project.name,
      'scenario_id', p_scenario_id,
      'scenario_name', COALESCE(v_scenario.name, 'Baseline'),
      'generated_at', now(),
      'currency', 'EUR',
      'vat_rate', v_vat_rate,
      'horizon_years', 3
    ),
    'summary', v_summary,
    'line_items', v_line_items,
    'hypotheses', v_hypotheses,
    'forecasts', v_forecasts,
    'pnl', v_pnl,
    'cash_monthly', v_monthly_data,
    'balance_sheet', '{}'::JSONB,
    'funding_plan', '{}'::JSONB,
    'wcr_bfr', '{}'::JSONB
  );
  
  RETURN v_result;
END;
$$;

-- 10. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.rpc_compute_line_revenue TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_get_fin_pdf_bundle TO authenticated;