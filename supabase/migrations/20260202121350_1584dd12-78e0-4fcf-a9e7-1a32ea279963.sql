-- TAEX-238: Add laundromat status fields for close/reactivate functionality
-- Add status fields to sites table
ALTER TABLE public.sites 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
ADD COLUMN IF NOT EXISTS closed_at timestamptz NULL,
ADD COLUMN IF NOT EXISTS closed_by uuid NULL,
ADD COLUMN IF NOT EXISTS reactivated_at timestamptz NULL,
ADD COLUMN IF NOT EXISTS reactivated_by uuid NULL;

-- Create indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_sites_user_id_status ON public.sites(user_id, status);
CREATE INDEX IF NOT EXISTS idx_sites_status_updated_at ON public.sites(status, updated_at DESC);

-- Comment on columns
COMMENT ON COLUMN public.sites.status IS 'Laundromat status: active or closed';
COMMENT ON COLUMN public.sites.closed_at IS 'Timestamp when laundromat was closed';
COMMENT ON COLUMN public.sites.closed_by IS 'User who closed the laundromat';
COMMENT ON COLUMN public.sites.reactivated_at IS 'Timestamp when laundromat was reactivated';
COMMENT ON COLUMN public.sites.reactivated_by IS 'User who reactivated the laundromat';