
-- TAEX-301 Commande 2: Colonne categorie générée sur operations
-- Taxonomie: CYCLE | PRODUCT | OPTION

-- 1. Fonction immutable de classification
CREATE OR REPLACE FUNCTION public.fn_classify_operation_category(
  p_program TEXT,
  p_machine TEXT
) RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE PARALLEL SAFE
SET search_path = public
AS $$
DECLARE
  txt TEXT;
BEGIN
  txt := lower(
    coalesce(p_program, '') || ' ' || coalesce(p_machine, '')
  );
  -- Remove accents (basic NFD-like normalization)
  txt := translate(txt,
    'àâäéèêëïîôùûüÿçñ',
    'aaaeeeeiioouuyçn'
  );

  -- PRODUCT keywords (most specific first)
  IF txt ~ '(lessive|assouplissant|savon|produit|detergent|softener|soap|adoucissant|javel|desinfectant)' THEN
    RETURN 'PRODUCT';
  END IF;

  -- OPTION keywords
  IF txt ~ '(prelavage|rincage|sechage|demarrage|essorage|option|extra|supplement)' THEN
    RETURN 'OPTION';
  END IF;

  -- Default: CYCLE (most common)
  RETURN 'CYCLE';
END;
$$;

COMMENT ON FUNCTION public.fn_classify_operation_category IS
'Classifie une opération en CYCLE, PRODUCT ou OPTION selon program/machine. Immutable pour colonne générée.';

-- 2. Colonne générée
ALTER TABLE public.operations
ADD COLUMN IF NOT EXISTS categorie TEXT
GENERATED ALWAYS AS (
  public.fn_classify_operation_category(program, machine)
) STORED;

-- 3. Index pour filtrage/agrégation rapide
CREATE INDEX IF NOT EXISTS idx_operations_categorie
ON public.operations (categorie);

COMMENT ON COLUMN public.operations.categorie IS
'Catégorie auto-classifiée: CYCLE | PRODUCT | OPTION. Colonne générée à partir de program+machine.';
