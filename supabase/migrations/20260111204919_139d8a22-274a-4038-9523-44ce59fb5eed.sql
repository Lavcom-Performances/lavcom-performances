-- B) MIGRATION: Rescale centimes → euros pour les données importées en centimes
-- 
-- Les données du site 9b8f4529... (et potentiellement 4d17292a...) ont des montants en centimes
-- On identifie les batches "events" (source=events) qui ont des montants > 100 comme étant en centimes
--
-- Règle: si amount > 100 ET source = 'events', diviser par 100

-- 1. Rescale amount pour les opérations en centimes
UPDATE public.operations
SET 
  amount = ROUND((amount / 100)::numeric, 2),
  price_cb = CASE WHEN price_cb IS NOT NULL THEN ROUND((price_cb / 100)::numeric, 2) ELSE NULL END,
  price_esp = CASE WHEN price_esp IS NOT NULL THEN ROUND((price_esp / 100)::numeric, 2) ELSE NULL END,
  price_eur = CASE WHEN price_eur IS NOT NULL THEN ROUND((price_eur / 100)::numeric, 2) ELSE NULL END,
  inserted_eur = CASE WHEN inserted_eur IS NOT NULL THEN ROUND((inserted_eur / 100)::numeric, 2) ELSE NULL END,
  change_eur = CASE WHEN change_eur IS NOT NULL THEN ROUND((change_eur / 100)::numeric, 2) ELSE NULL END
WHERE source = 'events' 
  AND amount > 100;

-- 2. Créer ou remplacer la fonction RPC calendar KPIs pour utiliser amount + payment_mode
CREATE OR REPLACE FUNCTION public.rpc_operations_calendar_kpis(p_site_id uuid)
RETURNS TABLE (
  period text,
  revenue_total numeric,
  revenue_cb numeric,
  revenue_esp numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- ownership check (multi-tenant)
  IF NOT EXISTS (
    SELECT 1 FROM public.sites
    WHERE id = p_site_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT
      (operation_date::date) AS d,
      amount,
      -- Use price_cb/price_esp if available, otherwise derive from amount + payment_mode
      COALESCE(
        price_cb,
        CASE WHEN UPPER(payment_mode) = 'CB' THEN amount ELSE 0 END
      ) AS cb,
      COALESCE(
        price_esp,
        CASE WHEN UPPER(payment_mode) IN ('ESP', 'ESPÈCES', 'ESPECES', 'CASH') THEN amount ELSE 0 END
      ) AS esp
    FROM public.operations
    WHERE site_id = p_site_id
      AND user_id = auth.uid()
  ),
  today_data AS (
    SELECT
      'day'::text AS period,
      COALESCE(SUM(amount), 0) AS revenue_total,
      COALESCE(SUM(cb), 0) AS revenue_cb,
      COALESCE(SUM(esp), 0) AS revenue_esp
    FROM base
    WHERE d = CURRENT_DATE
  ),
  month_data AS (
    SELECT
      'month'::text AS period,
      COALESCE(SUM(amount), 0) AS revenue_total,
      COALESCE(SUM(cb), 0) AS revenue_cb,
      COALESCE(SUM(esp), 0) AS revenue_esp
    FROM base
    WHERE date_trunc('month', d) = date_trunc('month', CURRENT_DATE)
  ),
  year_data AS (
    SELECT
      'year'::text AS period,
      COALESCE(SUM(amount), 0) AS revenue_total,
      COALESCE(SUM(cb), 0) AS revenue_cb,
      COALESCE(SUM(esp), 0) AS revenue_esp
    FROM base
    WHERE EXTRACT(year FROM d) = EXTRACT(year FROM CURRENT_DATE)
  )
  SELECT * FROM today_data
  UNION ALL SELECT * FROM month_data
  UNION ALL SELECT * FROM year_data;
END;
$$;