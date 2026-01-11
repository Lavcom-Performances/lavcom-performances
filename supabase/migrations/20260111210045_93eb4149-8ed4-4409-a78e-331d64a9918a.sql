-- Fix manual source data that is still in centimes
-- Heuristic: if source = 'manual' AND amount > 100 AND price_cb/price_esp also > 100, divide by 100

UPDATE public.operations
SET 
  amount = ROUND((amount / 100)::numeric, 2),
  price_cb = CASE WHEN price_cb IS NOT NULL AND price_cb > 100 THEN ROUND((price_cb / 100)::numeric, 2) ELSE price_cb END,
  price_esp = CASE WHEN price_esp IS NOT NULL AND price_esp > 100 THEN ROUND((price_esp / 100)::numeric, 2) ELSE price_esp END,
  price_eur = CASE WHEN price_eur IS NOT NULL AND price_eur > 100 THEN ROUND((price_eur / 100)::numeric, 2) ELSE price_eur END,
  inserted_eur = CASE WHEN inserted_eur IS NOT NULL AND inserted_eur > 100 THEN ROUND((inserted_eur / 100)::numeric, 2) ELSE inserted_eur END,
  change_eur = CASE WHEN change_eur IS NOT NULL AND change_eur > 100 THEN ROUND((change_eur / 100)::numeric, 2) ELSE change_eur END
WHERE source = 'manual' 
  AND amount > 100;