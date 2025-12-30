-- Add import_hash column for deduplication
ALTER TABLE public.operations 
ADD COLUMN IF NOT EXISTS import_hash text;

-- Create index for faster duplicate lookups
CREATE INDEX IF NOT EXISTS idx_operations_import_hash 
ON public.operations(site_id, import_hash) 
WHERE import_hash IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.operations.import_hash IS 'SHA256 fingerprint for deduplication: site_id + date + mode + amount + machine';