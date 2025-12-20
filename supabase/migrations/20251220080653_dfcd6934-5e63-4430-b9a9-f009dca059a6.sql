-- Add is_demo column to sites table for demo data isolation
ALTER TABLE public.sites 
ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

-- Create index for filtering demo sites
CREATE INDEX IF NOT EXISTS idx_sites_is_demo ON public.sites(is_demo);

-- Add comment for documentation
COMMENT ON COLUMN public.sites.is_demo IS 'Flag to identify demo/sample sites that should be excluded from production views';