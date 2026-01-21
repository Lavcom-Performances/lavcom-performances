-- Create DR drill runs table for tracking all drill executions
CREATE TABLE public.dr_drill_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id UUID NOT NULL,
  actor_email TEXT,
  environment TEXT NOT NULL DEFAULT 'staging',
  site_id UUID,
  site_name TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'blocked')),
  duration_ms INTEGER,
  blocked_reason TEXT,
  overall_passed BOOLEAN,
  rto_met BOOLEAN,
  steps_summary JSONB DEFAULT '{}',
  artifacts_paths JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dr_drill_runs ENABLE ROW LEVEL SECURITY;

-- Platform admins can view all drill runs
CREATE POLICY "Platform admins can view drill runs"
ON public.dr_drill_runs
FOR SELECT
USING (is_platform_admin(auth.uid()) OR is_platform_super_admin(auth.uid()));

-- Platform super admins can manage drill runs (insert, update)
CREATE POLICY "Platform super admins can manage drill runs"
ON public.dr_drill_runs
FOR ALL
USING (is_platform_super_admin(auth.uid()))
WITH CHECK (is_platform_super_admin(auth.uid()));

-- Create indexes for querying
CREATE INDEX idx_dr_drill_runs_started_at ON public.dr_drill_runs(started_at DESC);
CREATE INDEX idx_dr_drill_runs_environment ON public.dr_drill_runs(environment);
CREATE INDEX idx_dr_drill_runs_status ON public.dr_drill_runs(status);
CREATE INDEX idx_dr_drill_runs_actor ON public.dr_drill_runs(actor_id);