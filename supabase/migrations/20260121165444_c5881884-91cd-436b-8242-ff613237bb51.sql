-- Create platform_feature_flags table for safe mode kill switches
CREATE TABLE public.platform_feature_flags (
  key TEXT PRIMARY KEY,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.platform_feature_flags ENABLE ROW LEVEL SECURITY;

-- Platform admins can read all flags
CREATE POLICY "Platform admins can read feature flags"
  ON public.platform_feature_flags
  FOR SELECT
  USING (is_platform_admin(auth.uid()) OR is_platform_super_admin(auth.uid()));

-- Only super_admin can update flags
CREATE POLICY "Only super_admin can update feature flags"
  ON public.platform_feature_flags
  FOR UPDATE
  USING (is_platform_super_admin(auth.uid()));

-- Service role can read (for edge functions)
CREATE POLICY "Service role can read feature flags"
  ON public.platform_feature_flags
  FOR SELECT
  USING (true);

-- Insert default flags
INSERT INTO public.platform_feature_flags (key, is_enabled, description) VALUES
  ('imports_enabled', true, 'CSV/data imports functionality'),
  ('ai_enabled', true, 'AI proxy and AI-powered features'),
  ('exports_enabled', true, 'Data export functionality'),
  ('stripe_checkout_enabled', true, 'Stripe checkout and payment processing'),
  ('recompute_analytics_enabled', true, 'Analytics recomputation jobs'),
  ('automated_dr_drill_enabled', false, 'Automated disaster recovery drills');

-- Create index for fast lookups
CREATE INDEX idx_platform_feature_flags_key ON public.platform_feature_flags(key);

-- Add updated_at trigger
CREATE TRIGGER set_platform_feature_flags_updated_at
  BEFORE UPDATE ON public.platform_feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();