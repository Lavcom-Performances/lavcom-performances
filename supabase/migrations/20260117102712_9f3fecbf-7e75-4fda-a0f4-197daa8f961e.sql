-- RPC pour récupérer les benchmarks anonymisés par scope géographique
-- Retourne: scope_type, scope_code, n_sites, median_daily_revenue, avg_cb_share, avg_esp_share, top_hours[]

CREATE OR REPLACE FUNCTION rpc_get_benchmarks(
  p_site_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_department_code TEXT;
  v_region_code TEXT;
  v_scope_type TEXT;
  v_scope_code TEXT;
  v_n_sites INT;
  v_result JSON;
  v_threshold INT := 10;
BEGIN
  -- 1) Récupérer le département et la région du site courant
  SELECT 
    s.department_code,
    g.region_code
  INTO v_department_code, v_region_code
  FROM sites s
  LEFT JOIN fr_geo_regions g ON g.department_code = s.department_code
  WHERE s.id = p_site_id
    AND s.is_demo = false;
  
  -- Si pas de département, retourner indisponible
  IF v_department_code IS NULL THEN
    RETURN json_build_object(
      'available', false,
      'reason', 'no_department'
    );
  END IF;
  
  -- 2) Essayer département d'abord
  SELECT COUNT(DISTINCT s.id)
  INTO v_n_sites
  FROM sites s
  WHERE s.department_code = v_department_code
    AND s.is_demo = false;
  
  IF v_n_sites >= v_threshold THEN
    v_scope_type := 'department';
    v_scope_code := v_department_code;
  ELSE
    -- 3) Essayer région
    SELECT COUNT(DISTINCT s.id)
    INTO v_n_sites
    FROM sites s
    JOIN fr_geo_regions g ON g.department_code = s.department_code
    WHERE g.region_code = v_region_code
      AND s.is_demo = false;
    
    IF v_n_sites >= v_threshold THEN
      v_scope_type := 'region';
      v_scope_code := v_region_code;
    ELSE
      -- 4) Essayer national
      SELECT COUNT(DISTINCT s.id)
      INTO v_n_sites
      FROM sites s
      WHERE s.is_demo = false
        AND s.country_code = 'FR';
      
      IF v_n_sites >= v_threshold THEN
        v_scope_type := 'national';
        v_scope_code := 'FR';
      ELSE
        -- Échantillon insuffisant
        RETURN json_build_object(
          'available', false,
          'reason', 'insufficient_sample',
          'n_sites', v_n_sites,
          'threshold', v_threshold
        );
      END IF;
    END IF;
  END IF;
  
  -- 5) Calculer les benchmarks agrégés
  WITH scope_sites AS (
    SELECT s.id
    FROM sites s
    LEFT JOIN fr_geo_regions g ON g.department_code = s.department_code
    WHERE s.is_demo = false
      AND (
        (v_scope_type = 'department' AND s.department_code = v_scope_code)
        OR (v_scope_type = 'region' AND g.region_code = v_scope_code)
        OR (v_scope_type = 'national' AND s.country_code = 'FR')
      )
  ),
  daily_stats AS (
    SELECT 
      ad.site_id,
      ad.date,
      ad.revenue AS daily_revenue,
      ad.revenue_card,
      ad.revenue_cash,
      ad.hourly_breakdown
    FROM analytics_daily ad
    JOIN scope_sites ss ON ss.id = ad.site_id
    WHERE ad.date BETWEEN p_start_date AND p_end_date
      AND ad.revenue > 0
  ),
  site_aggregates AS (
    SELECT 
      site_id,
      AVG(daily_revenue) AS avg_daily_revenue,
      SUM(revenue_card) AS total_cb,
      SUM(revenue_cash) AS total_esp,
      SUM(revenue_card) + SUM(revenue_cash) AS total_revenue
    FROM daily_stats
    GROUP BY site_id
  ),
  benchmarks AS (
    SELECT 
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY avg_daily_revenue) AS median_daily_revenue,
      AVG(CASE WHEN total_revenue > 0 THEN total_cb / total_revenue * 100 ELSE 0 END) AS avg_cb_share,
      AVG(CASE WHEN total_revenue > 0 THEN total_esp / total_revenue * 100 ELSE 0 END) AS avg_esp_share
    FROM site_aggregates
  ),
  -- Calculer les heures de pointe (top 3)
  hourly_aggregates AS (
    SELECT 
      (elem->>'hour')::int AS hour,
      SUM((elem->>'revenue')::numeric) AS total_hour_revenue
    FROM daily_stats ds,
         jsonb_array_elements(ds.hourly_breakdown::jsonb) AS elem
    WHERE ds.hourly_breakdown IS NOT NULL
    GROUP BY (elem->>'hour')::int
  ),
  top_hours AS (
    SELECT array_agg(hour ORDER BY total_hour_revenue DESC) AS hours
    FROM (
      SELECT hour, total_hour_revenue
      FROM hourly_aggregates
      ORDER BY total_hour_revenue DESC
      LIMIT 3
    ) t
  ),
  -- Ma valeur (site courant)
  my_stats AS (
    SELECT 
      AVG(ad.revenue) AS my_avg_daily_revenue,
      SUM(ad.revenue_card) AS my_total_cb,
      SUM(ad.revenue_cash) AS my_total_esp,
      SUM(ad.revenue_card) + SUM(ad.revenue_cash) AS my_total_revenue
    FROM analytics_daily ad
    WHERE ad.site_id = p_site_id
      AND ad.date BETWEEN p_start_date AND p_end_date
      AND ad.revenue > 0
  ),
  my_top_hours AS (
    SELECT array_agg(hour ORDER BY total_hour_revenue DESC) AS hours
    FROM (
      SELECT 
        (elem->>'hour')::int AS hour,
        SUM((elem->>'revenue')::numeric) AS total_hour_revenue
      FROM analytics_daily ad,
           jsonb_array_elements(ad.hourly_breakdown::jsonb) AS elem
      WHERE ad.site_id = p_site_id
        AND ad.date BETWEEN p_start_date AND p_end_date
        AND ad.hourly_breakdown IS NOT NULL
      GROUP BY (elem->>'hour')::int
      ORDER BY total_hour_revenue DESC
      LIMIT 3
    ) t
  )
  SELECT json_build_object(
    'available', true,
    'scope_type', v_scope_type,
    'scope_code', v_scope_code,
    'n_sites', v_n_sites,
    'threshold', v_threshold,
    'benchmark', json_build_object(
      'median_daily_revenue', COALESCE(b.median_daily_revenue, 0),
      'avg_cb_share', COALESCE(b.avg_cb_share, 0),
      'avg_esp_share', COALESCE(b.avg_esp_share, 0),
      'top_hours', COALESCE(th.hours, ARRAY[]::int[])
    ),
    'my_values', json_build_object(
      'avg_daily_revenue', COALESCE(ms.my_avg_daily_revenue, 0),
      'cb_share', CASE WHEN ms.my_total_revenue > 0 THEN ms.my_total_cb / ms.my_total_revenue * 100 ELSE 0 END,
      'esp_share', CASE WHEN ms.my_total_revenue > 0 THEN ms.my_total_esp / ms.my_total_revenue * 100 ELSE 0 END,
      'top_hours', COALESCE(mth.hours, ARRAY[]::int[])
    )
  )
  INTO v_result
  FROM benchmarks b, top_hours th, my_stats ms, my_top_hours mth;
  
  RETURN v_result;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION rpc_get_benchmarks(UUID, DATE, DATE) TO authenticated;