-- TAEX-245: Add provider field to sites table and price_fi column to operations
-- Provider binding: each site uses exactly one provider (no mixed imports)

-- Add provider column to sites table
ALTER TABLE public.sites 
ADD COLUMN IF NOT EXISTS provider text DEFAULT 'unknown' 
CHECK (provider IN ('wiline', 'lmcontrol', 'ck_square', 'electrocablage', 'unknown'));

-- Add comment for documentation
COMMENT ON COLUMN public.sites.provider IS 'CSV provider for this site: wiline, lmcontrol, ck_square, electrocablage, or unknown';

-- Add price_fi column to operations for loyalty payments
ALTER TABLE public.operations 
ADD COLUMN IF NOT EXISTS price_fi numeric DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.operations.price_fi IS 'Payment amount in euros via loyalty credit (FI mode)';

-- Create index for provider-based queries
CREATE INDEX IF NOT EXISTS idx_sites_provider ON public.sites(provider);

-- Create index for operations by payment mode for filtering
CREATE INDEX IF NOT EXISTS idx_operations_payment_mode ON public.operations(payment_mode) WHERE payment_mode IS NOT NULL;