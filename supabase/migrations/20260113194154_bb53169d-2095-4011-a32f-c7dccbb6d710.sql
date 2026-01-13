-- Create orphan_page_reviews table to track review status
CREATE TABLE public.orphan_page_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  route_path TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'flagged', 'deprecated', 'keep')),
  notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.orphan_page_reviews ENABLE ROW LEVEL SECURITY;

-- Only platform admins can view
CREATE POLICY "Platform admins can view orphan page reviews"
ON public.orphan_page_reviews
FOR SELECT
USING (is_platform_admin(auth.uid()) OR is_platform_super_admin(auth.uid()));

-- Only platform admins can insert
CREATE POLICY "Platform admins can insert orphan page reviews"
ON public.orphan_page_reviews
FOR INSERT
WITH CHECK (is_platform_admin(auth.uid()) OR is_platform_super_admin(auth.uid()));

-- Only platform admins can update
CREATE POLICY "Platform admins can update orphan page reviews"
ON public.orphan_page_reviews
FOR UPDATE
USING (is_platform_admin(auth.uid()) OR is_platform_super_admin(auth.uid()));

-- Only super admins can delete
CREATE POLICY "Platform super admins can delete orphan page reviews"
ON public.orphan_page_reviews
FOR DELETE
USING (is_platform_super_admin(auth.uid()));

-- Create updated_at trigger
CREATE TRIGGER update_orphan_page_reviews_updated_at
BEFORE UPDATE ON public.orphan_page_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();