
-- Les change_eur petits (< 1€) avec inserted_eur >= 10€ sont incorrects
-- 0.12 = devrait être 12€, etc.
-- Corriger change_eur en les multipliant par 100

UPDATE public.operations
SET change_eur = ROUND((change_eur * 100)::numeric, 2)
WHERE change_eur < 1 
  AND change_eur > 0
  AND inserted_eur >= 10;

-- Recalculer price_esp et amount pour ESP
UPDATE public.operations
SET 
  price_esp = ROUND((inserted_eur - COALESCE(change_eur, 0))::numeric, 2),
  amount = ROUND((inserted_eur - COALESCE(change_eur, 0))::numeric, 2)
WHERE payment_mode IN ('ESP', 'ESPECES', 'CASH', 'Espèces')
  AND inserted_eur IS NOT NULL
  AND change_eur IS NOT NULL;
