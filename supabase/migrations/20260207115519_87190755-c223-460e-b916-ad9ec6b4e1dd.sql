-- TAEX-306: Create beta_feedback table for structured feedback storage
CREATE TABLE public.beta_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  topic TEXT NOT NULL CHECK (topic IN ('data_import', 'kpis_dashboards', 'financial_projections', 'ux_navigation', 'onboarding', 'other')),
  sentiment TEXT NOT NULL CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  message TEXT,
  page_context TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient queries
CREATE INDEX idx_beta_feedback_company_id ON public.beta_feedback(company_id);
CREATE INDEX idx_beta_feedback_topic ON public.beta_feedback(topic);
CREATE INDEX idx_beta_feedback_sentiment ON public.beta_feedback(sentiment);
CREATE INDEX idx_beta_feedback_created_at ON public.beta_feedback(created_at DESC);

-- Enable RLS
ALTER TABLE public.beta_feedback ENABLE ROW LEVEL SECURITY;

-- RLS: Companies can see their own feedback only
CREATE POLICY "Companies can view their own feedback"
ON public.beta_feedback
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.organization_id = beta_feedback.company_id
  )
  OR
  EXISTS (
    SELECT 1 FROM organizations
    WHERE organizations.id = beta_feedback.company_id
    AND organizations.owner_id = auth.uid()
  )
);

-- RLS: Users can insert feedback for their company
CREATE POLICY "Users can create feedback for their company"
ON public.beta_feedback
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.organization_id = beta_feedback.company_id
    )
    OR
    EXISTS (
      SELECT 1 FROM organizations
      WHERE organizations.id = beta_feedback.company_id
      AND organizations.owner_id = auth.uid()
    )
  )
);

-- RLS: Platform admins can see all feedback
CREATE POLICY "Platform admins can view all feedback"
ON public.beta_feedback
FOR SELECT
USING (is_platform_admin(auth.uid()));

-- RLS: Platform admins can update feedback (mark as reviewed)
CREATE POLICY "Platform admins can update feedback"
ON public.beta_feedback
FOR UPDATE
USING (is_platform_admin(auth.uid()));

-- Add comment for documentation
COMMENT ON TABLE public.beta_feedback IS 'TAEX-306: Structured beta feedback storage. Append-only for users, platform admins can mark as reviewed.';