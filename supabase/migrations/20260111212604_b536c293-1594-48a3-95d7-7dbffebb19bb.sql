
-- Corriger les montants erronés 0.70€ -> 0.60€ (lessive)
-- Ces montants ont été mal importés

UPDATE public.operations
SET 
  amount = 0.60,
  price_esp = CASE WHEN price_esp = 0.70 THEN 0.60 ELSE price_esp END,
  price_cb = CASE WHEN price_cb = 0.70 THEN 0.60 ELSE price_cb END,
  price_eur = CASE WHEN price_eur = 0.70 THEN 0.60 ELSE price_eur END
WHERE amount = 0.70;
