-- Add project_mode and questionnaire_completed columns to fin_projects
-- project_mode: 'side_income' (default/recommended) or 'main_project' (advanced)
-- questionnaire_completed: tracks if user has completed initial questionnaire

ALTER TABLE public.fin_projects 
ADD COLUMN IF NOT EXISTS project_mode text NOT NULL DEFAULT 'side_income' 
  CHECK (project_mode IN ('side_income', 'main_project'));

ALTER TABLE public.fin_projects 
ADD COLUMN IF NOT EXISTS questionnaire_completed boolean NOT NULL DEFAULT false;

-- Add questionnaire responses as JSON (city, surface, machine_count, pricing_tier, financing)
ALTER TABLE public.fin_projects 
ADD COLUMN IF NOT EXISTS questionnaire_data jsonb DEFAULT NULL;

-- Add manager_salary hypothesis field for main_project mode
-- This is stored in fin_hypotheses but we also add it to the project for easy access

COMMENT ON COLUMN public.fin_projects.project_mode IS 'side_income = recommended default (no salary), main_project = includes manager salary and advanced KPIs';
COMMENT ON COLUMN public.fin_projects.questionnaire_completed IS 'True once user has completed the initial setup questionnaire';
COMMENT ON COLUMN public.fin_projects.questionnaire_data IS 'JSON with user answers: city, surface_size, machine_count_range, pricing_tier, financing_type, contribution_amount';