-- ============================================
-- UX FEEDBACK TABLE FOR PAGE-BY-PAGE VALIDATION
-- ============================================

-- Create ux_feedback table
CREATE TABLE public.ux_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_path TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  user_role TEXT,
  clarity_score TEXT NOT NULL CHECK (clarity_score IN ('clear', 'partial', 'unclear')),
  issue_type TEXT CHECK (issue_type IN ('understanding', 'complexity', 'missing_explanation', 'technical', 'other')),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ux_feedback ENABLE ROW LEVEL SECURITY;

-- Platform Admin can view all feedback (using existing is_platform_admin function)
CREATE POLICY "Platform admins can view all UX feedback"
ON public.ux_feedback
FOR SELECT
TO authenticated
USING (is_platform_admin(auth.uid()));

-- Authenticated users can insert their own feedback
CREATE POLICY "Users can submit UX feedback"
ON public.ux_feedback
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Anonymous users can also submit feedback (for simulator pages)
CREATE POLICY "Anonymous users can submit UX feedback"
ON public.ux_feedback
FOR INSERT
TO anon
WITH CHECK (user_id IS NULL);

-- Create index for efficient queries
CREATE INDEX idx_ux_feedback_page_path ON public.ux_feedback(page_path);
CREATE INDEX idx_ux_feedback_created_at ON public.ux_feedback(created_at DESC);
CREATE INDEX idx_ux_feedback_clarity ON public.ux_feedback(clarity_score);

-- Add comment
COMMENT ON TABLE public.ux_feedback IS 'Page-by-page UX clarity feedback from users during beta';