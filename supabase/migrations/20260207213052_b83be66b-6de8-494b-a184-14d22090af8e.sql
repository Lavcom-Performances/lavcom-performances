-- Fix rpc_compute_fin_forecast: use correct system_events columns (code, message, meta instead of event_type, payload)
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
  
  -- FIXED: Use correct column names (code, message, meta instead of event_type, payload)
  INSERT INTO system_events (source, code, severity, message, meta)
  VALUES (
    'fin_project', 
    'forecast_computed', 
    'info', 
    'Financial forecast computed for project',
    jsonb_build_object(
      'project_id', p_project_id, 
      'scenario_id', p_scenario_id,
      'horizon_years', p_horizon_years, 
      'hypothesis_version', v_hyp_version
    )
  );
  
  RETURN jsonb_build_object(
    'success', true, 'project_id', p_project_id, 'scenario_id', p_scenario_id,
    'horizon_years', p_horizon_years, 'hypothesis_version', v_hyp_version,
    'forecast_count', v_forecast_count
  );
END;
$$;