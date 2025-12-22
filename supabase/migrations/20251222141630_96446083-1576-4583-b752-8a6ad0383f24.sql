-- ============================================
-- TAEX-121: Stripe Checkout + Entitlements
-- ============================================

-- 1. Ajouter colonnes entitlement à profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS access_expires_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS max_projects integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS plan_code text,
ADD COLUMN IF NOT EXISTS last_purchase_at timestamp with time zone;

-- 2. Créer table purchases (historique des achats)
CREATE TABLE IF NOT EXISTS public.purchases (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_code text NOT NULL,
  stripe_session_id text NOT NULL UNIQUE,
  stripe_customer_id text,
  amount_ttc numeric NOT NULL,
  currency text NOT NULL DEFAULT 'eur',
  access_days integer NOT NULL,
  max_projects integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 3. Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON public.purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_stripe_session ON public.purchases(stripe_session_id);

-- 4. Enable RLS
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- 5. RLS policies pour purchases
CREATE POLICY "Users can view their own purchases"
ON public.purchases
FOR SELECT
USING (auth.uid() = user_id);

-- Note: INSERT/UPDATE/DELETE géré uniquement par le webhook (service_role)
CREATE POLICY "Service role can manage purchases"
ON public.purchases
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 6. Commentaires
COMMENT ON TABLE public.purchases IS 'Historique des achats Stripe pour les packs simulateur';
COMMENT ON COLUMN public.profiles.access_expires_at IS 'Date d''expiration de l''accès simulateur';
COMMENT ON COLUMN public.profiles.max_projects IS 'Nombre max de projets de simulation';
COMMENT ON COLUMN public.profiles.plan_code IS 'Code du dernier pack acheté';