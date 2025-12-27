-- Add new columns for Events CSV format support
-- These columns store additional data from the "Events" CSV format

ALTER TABLE public.operations 
ADD COLUMN IF NOT EXISTS inserted_eur numeric NULL,
ADD COLUMN IF NOT EXISTS price_eur numeric NULL,
ADD COLUMN IF NOT EXISTS change_eur numeric NULL,
ADD COLUMN IF NOT EXISTS machine_name text NULL,
ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS raw jsonb NULL;

-- Add index for source column for filtering
CREATE INDEX IF NOT EXISTS idx_operations_source ON public.operations(source);

-- Add comment for documentation
COMMENT ON COLUMN public.operations.inserted_eur IS 'Amount inserted in euros (ESP only)';
COMMENT ON COLUMN public.operations.price_eur IS 'Price in euros';
COMMENT ON COLUMN public.operations.change_eur IS 'Change returned in euros (ESP only)';
COMMENT ON COLUMN public.operations.machine_name IS 'Machine name from Events CSV (e.g., Seche linge 1)';
COMMENT ON COLUMN public.operations.source IS 'Import source: manual, events_csv, lm_control_csv';