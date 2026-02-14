
-- TAEX-311: Create kpi_objectives table for operator dashboard objectives
CREATE TABLE public.kpi_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  site_id uuid REFERENCES public.sites(id) ON DELETE CASCADE,
  period_month date NOT NULL, -- first day of month
  scope text NOT NULL CHECK (scope IN ('GLOBAL', 'CATEGORY', 'MACHINE')),
  category text CHECK (category IN ('WASH', 'DRY', 'PRODUCT', 'OPTION', 'SERVICE')),
  machine_label text,
  objective_amount_cents bigint NOT NULL CHECK (objective_amount_cents >= 0),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_kpi_objectives_company_month ON public.kpi_objectives (company_id, period_month);
CREATE INDEX idx_kpi_objectives_company_scope_month ON public.kpi_objectives (company_id, scope, period_month);
CREATE INDEX idx_kpi_objectives_company_category_month ON public.kpi_objectives (company_id, category, period_month);

-- Enable RLS
ALTER TABLE public.kpi_objectives ENABLE ROW LEVEL SECURITY;

-- RLS: Users can manage objectives for their own company
-- Using organization membership via user_roles table
CREATE POLICY "Users can view their company objectives"
ON public.kpi_objectives
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.organization_id = kpi_objectives.company_id
  )
);

CREATE POLICY "Users can insert objectives for their company"
ON public.kpi_objectives
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.organization_id = kpi_objectives.company_id
  )
);

CREATE POLICY "Users can update their company objectives"
ON public.kpi_objectives
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.organization_id = kpi_objectives.company_id
  )
);

CREATE POLICY "Users can delete their company objectives"
ON public.kpi_objectives
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.organization_id = kpi_objectives.company_id
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_kpi_objectives_updated_at
BEFORE UPDATE ON public.kpi_objectives
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
