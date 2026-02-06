-- Fix the rpc_get_fin_pdf_bundle function to handle null scenario properly
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
  v_scenario_name TEXT := 'Baseline';
  v_workspace RECORD;
  v_result JSONB;
  v_pnl JSONB;
  v_summary JSONB;
  v_line_items JSONB;
  v_forecasts JSONB;
  v_hypotheses JSONB;
  v_year1_revenue_ht NUMERIC := 0;
  v_year2_revenue_ht NUMERIC := 0;
  v_year3_revenue_ht NUMERIC := 0;
  v_year1_ebitda NUMERIC := 0;
  v_year2_ebitda NUMERIC := 0;
  v_year3_ebitda NUMERIC := 0;
  v_year1_revenue_ttc NUMERIC := 0;
  v_year2_revenue_ttc NUMERIC := 0;
  v_year3_revenue_ttc NUMERIC := 0;
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
  
  -- Get scenario name if provided
  IF p_scenario_id IS NOT NULL THEN
    SELECT name INTO v_scenario_name FROM fin_scenarios WHERE id = p_scenario_id;
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
  
  -- Build P&L structure
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
      'scenario_name', v_scenario_name,
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