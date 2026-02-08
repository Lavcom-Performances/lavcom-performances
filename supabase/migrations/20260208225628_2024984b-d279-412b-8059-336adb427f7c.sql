-- =====================================================
-- MIGRATION: Enforce Line-Based Revenue Engine
-- Replace "monthly_revenue" hypothesis with line items computation
-- =====================================================

-- Drop and recreate the forecast compute function to use line items
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
  v_base_monthly_revenue NUMERIC;
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
  v_line_items_count INT := 0;
  v_vat_rate NUMERIC;
BEGIN
  -- Check ownership
  IF NOT owns_fin_project(p_project_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  -- Get hypothesis version
  SELECT COALESCE(MAX(version), 1) INTO v_hyp_version
  FROM fin_hypotheses WHERE project_id = p_project_id;
  
  -- Build hypotheses object
  SELECT jsonb_object_agg(key, value) INTO v_hypotheses
  FROM fin_hypotheses WHERE project_id = p_project_id;
  
  -- Apply scenario overrides if applicable
  IF p_scenario_id IS NOT NULL THEN
    SELECT COALESCE(v_hypotheses, '{}'::jsonb) || COALESCE(hypotheses_override, '{}'::jsonb) INTO v_hypotheses
    FROM fin_scenarios WHERE id = p_scenario_id AND project_id = p_project_id;
  END IF;
  
  -- =====================================================
  -- CRITICAL: Compute revenue from LINE ITEMS only
  -- No more "monthly_revenue" hypothesis!
  -- =====================================================
  
  -- Count active line items
  SELECT COUNT(*) INTO v_line_items_count
  FROM fin_line_items
  WHERE project_id = p_project_id
    AND deleted_at IS NULL
    AND is_active = TRUE
    AND (scenario_id IS NULL OR scenario_id = p_scenario_id);
  
  -- GUARDRAIL: Block computation if no line items exist
  IF v_line_items_count = 0 THEN
    RAISE EXCEPTION 'MISSING_LINE_ITEMS: Ajoutez au moins une ligne machine/service avec un prix et un taux d''utilisation pour calculer le prévisionnel.';
  END IF;
  
  -- Compute base monthly revenue TTC from line items
  -- Formula: SUM(price_ttc * quantity * cycles_per_day * days_open * utilization_rate)
  SELECT COALESCE(SUM(
    (price_ttc_cents / 100.0) * quantity * cycles_per_day_per_unit * open_days_per_month * utilization_rate
  ), 0) INTO v_base_monthly_revenue
  FROM fin_line_items
  WHERE project_id = p_project_id
    AND deleted_at IS NULL
    AND is_active = TRUE
    AND (scenario_id IS NULL OR scenario_id = p_scenario_id);
  
  -- Get project VAT rate for HT conversion
  SELECT COALESCE(vat_rate, 0.20) INTO v_vat_rate
  FROM fin_projects WHERE id = p_project_id;
  
  -- Get other hypothesis values (NOT monthly_revenue!)
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
  
  -- Monthly depreciation
  v_depreciation := v_initial_investment / GREATEST(v_depreciation_years, 1) / 12;
  
  -- Clear existing forecasts for this project/scenario
  DELETE FROM fin_forecasts
  WHERE project_id = p_project_id
    AND (scenario_id = p_scenario_id OR (p_scenario_id IS NULL AND scenario_id IS NULL));
  
  -- Generate monthly forecasts
  FOR v_year IN 1..p_horizon_years LOOP
    FOR v_month IN 1..12 LOOP
      -- Revenue TTC with growth and seasonality
      v_revenue := v_base_monthly_revenue 
        * POWER(1 + v_growth_rate, v_year - 1)
        * COALESCE((v_seasonality->(v_month - 1))::numeric, 1.0);
      
      -- Convert to HT for P&L (revenue is now stored as HT in forecasts)
      v_revenue := v_revenue / (1 + v_vat_rate);
      
      -- Costs calculation
      v_costs := v_fixed_costs + (v_revenue * v_variable_cost_rate);
      v_ebitda := v_revenue - v_costs;
      v_net_income := v_ebitda - v_depreciation;
      
      -- Interest charges
      IF v_loan_amount > 0 AND v_year <= v_loan_years THEN
        v_net_income := v_net_income - (v_loan_amount * v_loan_rate / 12);
      END IF;
      
      -- Cashflow calculation
      v_cashflow := v_ebitda;
      IF v_loan_amount > 0 AND v_year <= v_loan_years THEN
        v_cashflow := v_cashflow - (v_loan_amount / v_loan_years / 12);
      END IF;
      
      -- Initial investment in M1Y1
      IF v_year = 1 AND v_month = 1 THEN
        v_cashflow := v_cashflow - v_initial_investment + v_loan_amount;
      END IF;
      
      v_cumulative := v_cumulative + v_cashflow;
      
      -- Insert forecast row
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
  
  -- Log the computation
  INSERT INTO system_events (source, code, severity, message, meta)
  VALUES (
    'fin_project', 
    'forecast_computed', 
    'info', 
    'Financial forecast computed from line items',
    jsonb_build_object(
      'project_id', p_project_id, 
      'scenario_id', p_scenario_id,
      'horizon_years', p_horizon_years, 
      'hypothesis_version', v_hyp_version,
      'line_items_count', v_line_items_count,
      'base_monthly_revenue_ttc', v_base_monthly_revenue
    )
  );
  
  RETURN jsonb_build_object(
    'success', true, 
    'project_id', p_project_id, 
    'scenario_id', p_scenario_id,
    'horizon_years', p_horizon_years, 
    'hypothesis_version', v_hyp_version,
    'forecast_count', v_forecast_count,
    'line_items_count', v_line_items_count,
    'base_monthly_revenue_ttc', v_base_monthly_revenue
  );
END;
$$;

-- =====================================================
-- Update the PDF bundle RPC to include line items revenue calculation
-- =====================================================

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
  v_vat_rate NUMERIC;
  v_hypotheses JSONB;
  v_line_items JSONB;
  v_forecasts JSONB;
  v_pnl JSONB;
  v_cash_monthly JSONB;
  v_summary JSONB;
  v_base_monthly_revenue_ttc NUMERIC;
  v_base_monthly_revenue_ht NUMERIC;
  v_total_vat_year1 NUMERIC;
  v_year1_revenue NUMERIC;
  v_year1_ebitda NUMERIC;
BEGIN
  -- Get project info
  SELECT p.*, w.owner_user_id INTO v_project
  FROM fin_projects p
  JOIN fin_workspaces w ON p.workspace_id = w.id
  WHERE p.id = p_project_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project not found';
  END IF;
  
  -- Get VAT rate
  v_vat_rate := COALESCE(v_project.vat_rate, 0.20);
  
  -- Get scenario name if applicable
  IF p_scenario_id IS NOT NULL THEN
    SELECT name INTO v_scenario_name
    FROM fin_scenarios WHERE id = p_scenario_id AND project_id = p_project_id;
  END IF;
  
  -- Get hypotheses
  SELECT jsonb_agg(jsonb_build_object(
    'key', key, 
    'value', value, 
    'label', label, 
    'category', category,
    'unit', unit,
    'meta', meta
  )) INTO v_hypotheses
  FROM fin_hypotheses 
  WHERE project_id = p_project_id 
    AND deleted_at IS NULL;
  
  -- Get line items with computed monthly revenue
  SELECT jsonb_agg(jsonb_build_object(
    'id', id,
    'category', category,
    'item_type', item_type,
    'label', label,
    'capacity_kg', capacity_kg,
    'quantity', quantity,
    'price_ttc_cents', price_ttc_cents,
    'cycles_per_day', cycles_per_day_per_unit,
    'open_days', open_days_per_month,
    'utilization_rate', utilization_rate,
    'monthly_revenue_ttc', (price_ttc_cents / 100.0) * quantity * cycles_per_day_per_unit * open_days_per_month * utilization_rate
  ) ORDER BY sort_order) INTO v_line_items
  FROM fin_line_items
  WHERE project_id = p_project_id
    AND deleted_at IS NULL
    AND is_active = TRUE
    AND (scenario_id IS NULL OR scenario_id = p_scenario_id);
  
  -- Compute base monthly revenue from line items
  SELECT COALESCE(SUM(
    (price_ttc_cents / 100.0) * quantity * cycles_per_day_per_unit * open_days_per_month * utilization_rate
  ), 0) INTO v_base_monthly_revenue_ttc
  FROM fin_line_items
  WHERE project_id = p_project_id
    AND deleted_at IS NULL
    AND is_active = TRUE
    AND (scenario_id IS NULL OR scenario_id = p_scenario_id);
  
  v_base_monthly_revenue_ht := v_base_monthly_revenue_ttc / (1 + v_vat_rate);
  
  -- Get forecasts
  SELECT jsonb_agg(jsonb_build_object(
    'year', year,
    'month', month,
    'revenue', revenue,
    'costs', costs,
    'ebitda', ebitda,
    'cashflow', cashflow,
    'depreciation', depreciation,
    'net_income', net_income,
    'cumulative_cashflow', cumulative_cashflow
  ) ORDER BY year, month) INTO v_forecasts
  FROM fin_forecasts
  WHERE project_id = p_project_id
    AND (scenario_id = p_scenario_id OR (p_scenario_id IS NULL AND scenario_id IS NULL));
  
  -- Compute annual P&L summary
  SELECT jsonb_build_object(
    'year1', jsonb_build_object(
      'revenue_ht', COALESCE(SUM(CASE WHEN year = 1 THEN revenue ELSE 0 END), 0),
      'ebitda', COALESCE(SUM(CASE WHEN year = 1 THEN ebitda ELSE 0 END), 0)
    ),
    'year2', jsonb_build_object(
      'revenue_ht', COALESCE(SUM(CASE WHEN year = 2 THEN revenue ELSE 0 END), 0),
      'ebitda', COALESCE(SUM(CASE WHEN year = 2 THEN ebitda ELSE 0 END), 0)
    ),
    'year3', jsonb_build_object(
      'revenue_ht', COALESCE(SUM(CASE WHEN year = 3 THEN revenue ELSE 0 END), 0),
      'ebitda', COALESCE(SUM(CASE WHEN year = 3 THEN ebitda ELSE 0 END), 0)
    )
  ) INTO v_pnl
  FROM fin_forecasts
  WHERE project_id = p_project_id
    AND (scenario_id = p_scenario_id OR (p_scenario_id IS NULL AND scenario_id IS NULL));
  
  -- Get year 1 totals
  SELECT 
    COALESCE(SUM(revenue), 0),
    COALESCE(SUM(ebitda), 0)
  INTO v_year1_revenue, v_year1_ebitda
  FROM fin_forecasts
  WHERE project_id = p_project_id
    AND year = 1
    AND (scenario_id = p_scenario_id OR (p_scenario_id IS NULL AND scenario_id IS NULL));
  
  -- Compute VAT for year 1 (revenue HT * VAT rate)
  v_total_vat_year1 := v_year1_revenue * v_vat_rate;
  
  -- Build cash monthly (first 12 months with TTC amounts)
  SELECT jsonb_agg(jsonb_build_object(
    'month', month,
    'revenue_ht', revenue,
    'revenue_ttc', revenue * (1 + v_vat_rate),
    'vat_collected', revenue * v_vat_rate
  ) ORDER BY month) INTO v_cash_monthly
  FROM fin_forecasts
  WHERE project_id = p_project_id
    AND year = 1
    AND (scenario_id = p_scenario_id OR (p_scenario_id IS NULL AND scenario_id IS NULL));
  
  -- Build summary
  v_summary := jsonb_build_object(
    'ca_ttc_year1', v_year1_revenue * (1 + v_vat_rate),
    'ca_ht_year1', v_year1_revenue,
    'ebitda_year1', v_year1_ebitda,
    'total_vat_year1', v_total_vat_year1,
    'base_monthly_revenue_ttc', v_base_monthly_revenue_ttc,
    'base_monthly_revenue_ht', v_base_monthly_revenue_ht,
    'line_items_count', COALESCE(jsonb_array_length(v_line_items), 0)
  );
  
  -- Return complete bundle
  RETURN jsonb_build_object(
    'meta', jsonb_build_object(
      'project_id', p_project_id,
      'project_name', v_project.name,
      'scenario_id', p_scenario_id,
      'scenario_name', v_scenario_name,
      'horizon_years', 3,
      'vat_rate', v_vat_rate
    ),
    'summary', v_summary,
    'hypotheses', COALESCE(v_hypotheses, '[]'::jsonb),
    'line_items', COALESCE(v_line_items, '[]'::jsonb),
    'forecasts', COALESCE(v_forecasts, '[]'::jsonb),
    'pnl', COALESCE(v_pnl, '{}'::jsonb),
    'cash_monthly', COALESCE(v_cash_monthly, '[]'::jsonb)
  );
END;
$$;