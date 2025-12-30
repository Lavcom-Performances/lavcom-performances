-- Analytics KPIs table - aggregated metrics per site per period
CREATE TABLE IF NOT EXISTS public.analytics_kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  period_type text NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'yearly')),
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_revenue numeric DEFAULT 0,
  total_transactions integer DEFAULT 0,
  revenue_card numeric DEFAULT 0,
  revenue_cash numeric DEFAULT 0,
  average_basket numeric DEFAULT 0,
  unique_machines integer DEFAULT 0,
  peak_hour integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (site_id, period_type, period_start)
);

-- Analytics Daily table - daily breakdown for charts
CREATE TABLE IF NOT EXISTS public.analytics_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  date date NOT NULL,
  revenue numeric DEFAULT 0,
  transactions integer DEFAULT 0,
  revenue_card numeric DEFAULT 0,
  revenue_cash numeric DEFAULT 0,
  average_basket numeric DEFAULT 0,
  machine_stats jsonb DEFAULT '{}',
  hourly_breakdown jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  UNIQUE (site_id, date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_analytics_kpis_site_period ON public.analytics_kpis (site_id, period_type, period_start);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_site_date ON public.analytics_daily (site_id, date);

-- Enable RLS
ALTER TABLE public.analytics_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_daily ENABLE ROW LEVEL SECURITY;

-- RLS Policies for analytics_kpis
CREATE POLICY "Users can view their own analytics_kpis"
ON public.analytics_kpis FOR SELECT
USING (auth.uid() = user_id AND owns_site(site_id));

CREATE POLICY "Users can create their own analytics_kpis"
ON public.analytics_kpis FOR INSERT
WITH CHECK (auth.uid() = user_id AND owns_site(site_id));

CREATE POLICY "Users can update their own analytics_kpis"
ON public.analytics_kpis FOR UPDATE
USING (auth.uid() = user_id AND owns_site(site_id));

CREATE POLICY "Users can delete their own analytics_kpis"
ON public.analytics_kpis FOR DELETE
USING (auth.uid() = user_id AND owns_site(site_id));

-- RLS Policies for analytics_daily
CREATE POLICY "Users can view their own analytics_daily"
ON public.analytics_daily FOR SELECT
USING (auth.uid() = user_id AND owns_site(site_id));

CREATE POLICY "Users can create their own analytics_daily"
ON public.analytics_daily FOR INSERT
WITH CHECK (auth.uid() = user_id AND owns_site(site_id));

CREATE POLICY "Users can update their own analytics_daily"
ON public.analytics_daily FOR UPDATE
USING (auth.uid() = user_id AND owns_site(site_id));

CREATE POLICY "Users can delete their own analytics_daily"
ON public.analytics_daily FOR DELETE
USING (auth.uid() = user_id AND owns_site(site_id));

-- Trigger for updated_at on analytics_kpis
CREATE TRIGGER update_analytics_kpis_updated_at
BEFORE UPDATE ON public.analytics_kpis
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();