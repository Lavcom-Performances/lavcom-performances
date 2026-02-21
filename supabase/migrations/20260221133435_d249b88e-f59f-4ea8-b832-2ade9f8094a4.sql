
-- Create simulator_leads table for storing simulation lead captures
CREATE TABLE IF NOT EXISTS public.simulator_leads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL,
  email text NOT NULL,
  stage text,
  capital_range text,
  machine_range text,
  zone_selected text,
  estimated_monthly_revenue numeric,
  estimated_annual_revenue numeric,
  pricing_snapshot jsonb,
  ici_score numeric,
  gap_score numeric,
  segmentation_type text CHECK (segmentation_type IN ('segment_a', 'segment_b', 'segment_c', 'segment_d'))
);

-- Enable Row Level Security
ALTER TABLE public.simulator_leads ENABLE ROW LEVEL SECURITY;

-- Allow service role to insert (Edge Function)
CREATE POLICY "Service role can insert leads"
  ON public.simulator_leads
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Allow service role to select (admin dashboards)
CREATE POLICY "Service role can select leads"
  ON public.simulator_leads
  FOR SELECT
  TO service_role
  USING (true);

-- Allow anon to insert (fallback from client-side)
CREATE POLICY "Anon can insert leads"
  ON public.simulator_leads
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Index on email for deduplication queries
CREATE INDEX IF NOT EXISTS idx_simulator_leads_email ON public.simulator_leads(email);

-- Index on segmentation_type for analytics
CREATE INDEX IF NOT EXISTS idx_simulator_leads_segment ON public.simulator_leads(segmentation_type);

-- Index on created_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_simulator_leads_created_at ON public.simulator_leads(created_at DESC);
