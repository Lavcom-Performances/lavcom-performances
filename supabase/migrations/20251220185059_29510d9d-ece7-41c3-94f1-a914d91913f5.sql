-- ================================================================
-- AUDIT RLS MULTI-TENANT - TAEX-105
-- Renforcement des policies avec double contrainte (user_id + site_id ownership)
-- ================================================================

-- 1. Créer une fonction helper SECURITY DEFINER pour vérifier l'ownership d'un site
-- Cela évite les problèmes de récursion RLS
CREATE OR REPLACE FUNCTION public.owns_site(_site_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.sites
    WHERE id = _site_id
      AND user_id = auth.uid()
  )
$$;

-- 2. Créer une fonction pour vérifier si un user est propriétaire d'une operation via son site
CREATE OR REPLACE FUNCTION public.owns_operation_site(_site_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.sites
    WHERE id = _site_id
      AND user_id = _user_id
      AND user_id = auth.uid()
  )
$$;

-- ================================================================
-- OPERATIONS - Renforcer les policies
-- ================================================================

-- Supprimer les anciennes policies
DROP POLICY IF EXISTS "Users can view their own operations" ON public.operations;
DROP POLICY IF EXISTS "Users can create their own operations" ON public.operations;
DROP POLICY IF EXISTS "Users can update their own operations" ON public.operations;
DROP POLICY IF EXISTS "Users can delete their own operations" ON public.operations;

-- Nouvelles policies avec double contrainte
CREATE POLICY "Users can view their own operations" 
ON public.operations 
FOR SELECT 
USING (
  auth.uid() = user_id 
  AND public.owns_site(site_id)
);

CREATE POLICY "Users can create their own operations" 
ON public.operations 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND public.owns_site(site_id)
);

CREATE POLICY "Users can update their own operations" 
ON public.operations 
FOR UPDATE 
USING (
  auth.uid() = user_id 
  AND public.owns_site(site_id)
);

CREATE POLICY "Users can delete their own operations" 
ON public.operations 
FOR DELETE 
USING (
  auth.uid() = user_id 
  AND public.owns_site(site_id)
);

-- ================================================================
-- IMPORT_BATCHES - Renforcer les policies + ajouter UPDATE
-- ================================================================

-- Supprimer les anciennes policies
DROP POLICY IF EXISTS "Users can view their own import batches" ON public.import_batches;
DROP POLICY IF EXISTS "Users can create their own import batches" ON public.import_batches;
DROP POLICY IF EXISTS "Users can delete their own import batches" ON public.import_batches;

-- Nouvelles policies avec double contrainte
CREATE POLICY "Users can view their own import batches" 
ON public.import_batches 
FOR SELECT 
USING (
  auth.uid() = user_id 
  AND public.owns_site(site_id)
);

CREATE POLICY "Users can create their own import batches" 
ON public.import_batches 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND public.owns_site(site_id)
);

-- Ajouter la policy UPDATE manquante
CREATE POLICY "Users can update their own import batches" 
ON public.import_batches 
FOR UPDATE 
USING (
  auth.uid() = user_id 
  AND public.owns_site(site_id)
);

CREATE POLICY "Users can delete their own import batches" 
ON public.import_batches 
FOR DELETE 
USING (
  auth.uid() = user_id 
  AND public.owns_site(site_id)
);

-- ================================================================
-- SITE_COSTS - Renforcer les policies
-- ================================================================

-- Supprimer les anciennes policies
DROP POLICY IF EXISTS "Users can view their own site costs" ON public.site_costs;
DROP POLICY IF EXISTS "Users can create their own site costs" ON public.site_costs;
DROP POLICY IF EXISTS "Users can update their own site costs" ON public.site_costs;
DROP POLICY IF EXISTS "Users can delete their own site costs" ON public.site_costs;

-- Nouvelles policies avec double contrainte
CREATE POLICY "Users can view their own site costs" 
ON public.site_costs 
FOR SELECT 
USING (
  auth.uid() = user_id 
  AND public.owns_site(site_id)
);

CREATE POLICY "Users can create their own site costs" 
ON public.site_costs 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND public.owns_site(site_id)
);

CREATE POLICY "Users can update their own site costs" 
ON public.site_costs 
FOR UPDATE 
USING (
  auth.uid() = user_id 
  AND public.owns_site(site_id)
);

CREATE POLICY "Users can delete their own site costs" 
ON public.site_costs 
FOR DELETE 
USING (
  auth.uid() = user_id 
  AND public.owns_site(site_id)
);

-- ================================================================
-- USER_GOALS - Renforcer les policies (site_id nullable)
-- ================================================================

-- Supprimer les anciennes policies
DROP POLICY IF EXISTS "Users can view their own goals" ON public.user_goals;
DROP POLICY IF EXISTS "Users can create their own goals" ON public.user_goals;
DROP POLICY IF EXISTS "Users can update their own goals" ON public.user_goals;
DROP POLICY IF EXISTS "Users can delete their own goals" ON public.user_goals;

-- Nouvelles policies (site_id peut être null, donc on vérifie seulement si non-null)
CREATE POLICY "Users can view their own goals" 
ON public.user_goals 
FOR SELECT 
USING (
  auth.uid() = user_id 
  AND (site_id IS NULL OR public.owns_site(site_id))
);

CREATE POLICY "Users can create their own goals" 
ON public.user_goals 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND (site_id IS NULL OR public.owns_site(site_id))
);

CREATE POLICY "Users can update their own goals" 
ON public.user_goals 
FOR UPDATE 
USING (
  auth.uid() = user_id 
  AND (site_id IS NULL OR public.owns_site(site_id))
);

CREATE POLICY "Users can delete their own goals" 
ON public.user_goals 
FOR DELETE 
USING (
  auth.uid() = user_id 
  AND (site_id IS NULL OR public.owns_site(site_id))
);