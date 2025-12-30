-- 1) Ensure dedupe_key is nullable for stability
ALTER TABLE public.operations
  ALTER COLUMN dedupe_key DROP NOT NULL;

-- 2) Create function to compute stable dedupe_key (md5)
CREATE OR REPLACE FUNCTION public.set_operations_dedupe_key()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- Calculate dedupe_key if missing or empty
  IF NEW.dedupe_key IS NULL OR NEW.dedupe_key = '' THEN
    NEW.dedupe_key := md5(
      COALESCE(NEW.site_id::text, '') || '|' ||
      COALESCE(NEW.operation_date::text, '') || '|' ||
      COALESCE(NEW.operation_time::text, '') || '|' ||
      COALESCE(NEW.payment_mode, '') || '|' ||
      COALESCE(NEW.type, '') || '|' ||
      COALESCE(NEW.price_cb::text, '0') || '|' ||
      COALESCE(NEW.price_esp::text, '0') || '|' ||
      COALESCE(NEW.amount::text, '0')
    );
  END IF;
  RETURN NEW;
END;
$$;

-- 3) Create trigger BEFORE INSERT/UPDATE to ensure dedupe_key
DROP TRIGGER IF EXISTS trg_set_operations_dedupe_key ON public.operations;
CREATE TRIGGER trg_set_operations_dedupe_key
BEFORE INSERT OR UPDATE OF site_id, operation_date, operation_time, payment_mode, type, price_cb, price_esp, amount, dedupe_key
ON public.operations
FOR EACH ROW EXECUTE FUNCTION public.set_operations_dedupe_key();

-- 4) Backfill existing rows without dedupe_key
UPDATE public.operations
SET dedupe_key = md5(
  COALESCE(site_id::text, '') || '|' ||
  COALESCE(operation_date::text, '') || '|' ||
  COALESCE(operation_time::text, '') || '|' ||
  COALESCE(payment_mode, '') || '|' ||
  COALESCE(type, '') || '|' ||
  COALESCE(price_cb::text, '0') || '|' ||
  COALESCE(price_esp::text, '0') || '|' ||
  COALESCE(amount::text, '0')
)
WHERE dedupe_key IS NULL OR dedupe_key = '';

-- 5) Create UNIQUE index for ON CONFLICT
DROP INDEX IF EXISTS public.operations_unique_dedupe;
CREATE UNIQUE INDEX operations_unique_site_dedupe
ON public.operations (site_id, dedupe_key);