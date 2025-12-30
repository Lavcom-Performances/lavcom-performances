-- Add new columns for enhanced deduplication and payment tracking

-- Add dedupe_key column for MD5-based deduplication
ALTER TABLE public.operations
ADD COLUMN IF NOT EXISTS dedupe_key text;

-- Add price_cb and price_esp for card/cash specific amounts
ALTER TABLE public.operations
ADD COLUMN IF NOT EXISTS price_cb numeric;

ALTER TABLE public.operations
ADD COLUMN IF NOT EXISTS price_esp numeric;

-- Add type column for operation type classification
ALTER TABLE public.operations
ADD COLUMN IF NOT EXISTS type text;

-- Backfill dedupe_key for existing rows using MD5 hash
-- Using the same pattern: site_id|date|time|mode|type|price_cb|price_esp|amount
UPDATE public.operations
SET dedupe_key = md5(
  coalesce(site_id::text, '') || '|' ||
  coalesce(operation_date::text, '') || '|' ||
  coalesce(operation_time::text, '') || '|' ||
  coalesce(payment_mode, '') || '|' ||
  coalesce(type, '') || '|' ||
  coalesce(price_cb::text, '0') || '|' ||
  coalesce(price_esp::text, '0') || '|' ||
  coalesce(amount::text, '0')
)
WHERE dedupe_key IS NULL;

-- Delete duplicates, keeping only the most recent one per (site_id, dedupe_key)
DELETE FROM public.operations
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY site_id, dedupe_key 
             ORDER BY created_at DESC
           ) as rn
    FROM public.operations
  ) sub
  WHERE rn > 1
);

-- Now create the unique index for upsert deduplication
CREATE UNIQUE INDEX IF NOT EXISTS operations_unique_dedupe
ON public.operations (site_id, dedupe_key);

-- Add comments for documentation
COMMENT ON COLUMN public.operations.dedupe_key IS 'MD5 hash for row deduplication during CSV import';
COMMENT ON COLUMN public.operations.price_cb IS 'Card payment amount in euros';
COMMENT ON COLUMN public.operations.price_esp IS 'Cash payment amount in euros';
COMMENT ON COLUMN public.operations.type IS 'Operation type classification';