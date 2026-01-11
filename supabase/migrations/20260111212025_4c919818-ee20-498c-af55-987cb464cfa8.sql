
-- Corriger les montants encore en centimes (>= 50)
-- Ces valeurs auraient dû être divisées par 100 mais ne l'ont pas été
-- 60 -> 0.60€ (lessive), 70 -> 0.70€, 100 -> 1.00€, etc.

UPDATE public.operations
SET 
  amount = ROUND((amount / 100)::numeric, 2),
  price_cb = CASE WHEN price_cb IS NOT NULL AND price_cb >= 50 THEN ROUND((price_cb / 100)::numeric, 2) ELSE price_cb END,
  price_esp = CASE WHEN price_esp IS NOT NULL AND price_esp >= 50 THEN ROUND((price_esp / 100)::numeric, 2) ELSE price_esp END,
  price_eur = CASE WHEN price_eur IS NOT NULL AND price_eur >= 50 THEN ROUND((price_eur / 100)::numeric, 2) ELSE price_eur END,
  inserted_eur = CASE WHEN inserted_eur IS NOT NULL AND inserted_eur >= 50 THEN ROUND((inserted_eur / 100)::numeric, 2) ELSE inserted_eur END,
  change_eur = CASE WHEN change_eur IS NOT NULL AND change_eur >= 50 THEN ROUND((change_eur / 100)::numeric, 2) ELSE change_eur END
WHERE amount >= 50;
