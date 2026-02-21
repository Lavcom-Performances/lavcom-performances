-- Phase 8: A/B testing column on simulator_leads
ALTER TABLE public.simulator_leads
  ADD COLUMN IF NOT EXISTS ab_variant text DEFAULT 'A';

-- Add check via trigger (not CHECK constraint per guidelines)
CREATE OR REPLACE FUNCTION public.validate_ab_variant()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.ab_variant IS NOT NULL AND NEW.ab_variant NOT IN ('A', 'B') THEN
    RAISE EXCEPTION 'ab_variant must be A or B';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_ab_variant
  BEFORE INSERT OR UPDATE ON public.simulator_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_ab_variant();

-- Index for analytics queries
CREATE INDEX IF NOT EXISTS idx_simulator_leads_ab_variant
  ON public.simulator_leads(ab_variant);