-- Create site_costs table for storing fixed and variable costs per site
CREATE TABLE public.site_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  -- Fixed costs (monthly)
  fixed_rent NUMERIC DEFAULT 850,
  fixed_lease NUMERIC DEFAULT 450,
  fixed_subscriptions NUMERIC DEFAULT 120,
  fixed_insurance NUMERIC DEFAULT 85,
  fixed_cleaning NUMERIC DEFAULT 200,
  fixed_other NUMERIC DEFAULT 50,
  -- Variable costs (percentages)
  var_energy_water_percent NUMERIC DEFAULT 12,
  var_detergent_percent NUMERIC DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (site_id)
);

-- Enable RLS
ALTER TABLE public.site_costs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own site costs"
ON public.site_costs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own site costs"
ON public.site_costs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own site costs"
ON public.site_costs FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own site costs"
ON public.site_costs FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_site_costs_updated_at
BEFORE UPDATE ON public.site_costs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();