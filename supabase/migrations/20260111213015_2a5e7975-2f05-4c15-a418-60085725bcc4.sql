
-- Corriger d'abord les change_eur encore en centimes (>= 10)
UPDATE public.operations
SET change_eur = ROUND((change_eur / 100)::numeric, 2)
WHERE change_eur >= 10;

-- Recalculer price_esp = inserted_eur - change_eur pour les paiements ESP
UPDATE public.operations
SET price_esp = ROUND((inserted_eur - COALESCE(change_eur, 0))::numeric, 2)
WHERE payment_mode IN ('ESP', 'ESPECES', 'CASH', 'Espèces')
  AND inserted_eur IS NOT NULL;

-- Recalculer amount aussi pour être cohérent
UPDATE public.operations
SET amount = ROUND((inserted_eur - COALESCE(change_eur, 0))::numeric, 2)
WHERE payment_mode IN ('ESP', 'ESPECES', 'CASH', 'Espèces')
  AND inserted_eur IS NOT NULL
  AND change_eur IS NOT NULL;
