-- Table pour le versioning analytics par site
CREATE TABLE IF NOT EXISTS public.site_analytics_state (
  site_id uuid PRIMARY KEY REFERENCES public.sites(id) ON DELETE CASCADE,
  analytics_version bigint NOT NULL DEFAULT 1,
  last_import_at timestamptz,
  last_import_status text,
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.site_analytics_state ENABLE ROW LEVEL SECURITY;

-- Policy: owner du site peut lire
CREATE POLICY "Users can view their site analytics state"
ON public.site_analytics_state
FOR SELECT
USING (owns_site(site_id));

-- Policy: owner du site peut insérer
CREATE POLICY "Users can create their site analytics state"
ON public.site_analytics_state
FOR INSERT
WITH CHECK (owns_site(site_id));

-- Policy: owner du site peut update
CREATE POLICY "Users can update their site analytics state"
ON public.site_analytics_state
FOR UPDATE
USING (owns_site(site_id));

-- Fonction pour incrémenter la version après import
CREATE OR REPLACE FUNCTION public.bump_analytics_version(p_site_id uuid, p_status text DEFAULT 'success')
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_version bigint;
BEGIN
  -- Upsert the analytics state
  INSERT INTO public.site_analytics_state (site_id, analytics_version, last_import_at, last_import_status, updated_at)
  VALUES (p_site_id, 1, now(), p_status, now())
  ON CONFLICT (site_id) DO UPDATE SET
    analytics_version = site_analytics_state.analytics_version + 1,
    last_import_at = now(),
    last_import_status = p_status,
    updated_at = now()
  RETURNING analytics_version INTO new_version;
  
  RETURN new_version;
END;
$$;