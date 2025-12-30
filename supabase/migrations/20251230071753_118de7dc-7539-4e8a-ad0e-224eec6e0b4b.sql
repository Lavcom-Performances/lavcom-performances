-- Create the UNIQUE index for deduplication (duplicates have been removed)
CREATE UNIQUE INDEX IF NOT EXISTS idx_operations_site_import_hash_unique 
ON public.operations(site_id, import_hash) 
WHERE import_hash IS NOT NULL;

-- Add comment for documentation
COMMENT ON INDEX public.idx_operations_site_import_hash_unique IS 'Unique constraint for deduplication: prevents duplicate imports based on site_id + import_hash';