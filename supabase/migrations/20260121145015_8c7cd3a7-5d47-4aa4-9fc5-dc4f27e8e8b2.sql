-- Create DR drill history table for storing drill results and metrics
CREATE TABLE public.dr_drill_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  drill_date DATE NOT NULL,
  actor_id UUID NOT NULL,
  actor_email TEXT,
  environment TEXT NOT NULL DEFAULT 'staging',
  incident_type TEXT,
  incident_site_id UUID,
  duration_minutes INTEGER NOT NULL,
  rto_target_minutes INTEGER NOT NULL DEFAULT 240,
  rto_met BOOLEAN NOT NULL,
  overall_passed BOOLEAN NOT NULL,
  steps JSONB NOT NULL DEFAULT '{}',
  step_details JSONB NOT NULL DEFAULT '[]',
  snapshots JSONB DEFAULT '{}',
  failures TEXT[] DEFAULT '{}',
  notes TEXT,
  screenshots JSONB DEFAULT '{}',
  evidence_folder TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dr_drill_history ENABLE ROW LEVEL SECURITY;

-- Platform admins can view all drill history
CREATE POLICY "Platform admins can view drill history"
ON public.dr_drill_history
FOR SELECT
USING (is_platform_admin(auth.uid()));

-- Platform super_admins can insert drill results
CREATE POLICY "Platform super admins can insert drill history"
ON public.dr_drill_history
FOR INSERT
WITH CHECK (is_platform_super_admin(auth.uid()));

-- Create indexes for querying
CREATE INDEX idx_dr_drill_history_drill_date ON public.dr_drill_history(drill_date DESC);
CREATE INDEX idx_dr_drill_history_overall_passed ON public.dr_drill_history(overall_passed);
CREATE INDEX idx_dr_drill_history_actor ON public.dr_drill_history(actor_id);