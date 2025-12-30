
-- RPC function to get churn prediction features for all subscriptions
CREATE OR REPLACE FUNCTION public.rpc_admin_churn_predictions()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Check admin access
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  -- Log admin action
  INSERT INTO public.admin_audit_logs (admin_user_id, action, details)
  VALUES (auth.uid(), 'view_churn_predictions', '{}'::jsonb);

  -- Build predictions based on behavioral features
  SELECT jsonb_agg(prediction ORDER BY churn_score DESC)
  FROM (
    SELECT 
      jsonb_build_object(
        'user_id', s.user_id,
        'email', p.email,
        'company_name', p.company_name,
        'plan_type', s.plan_type,
        'status', s.status,
        'subscription_start', s.subscription_start_date,
        'trial_end', s.trial_end_date,
        'laundry_count', COALESCE(s.laundry_count, 1),
        'days_active', EXTRACT(EPOCH FROM (NOW() - COALESCE(s.subscription_start_date, s.trial_start_date))) / 86400,
        'days_until_trial_end', CASE 
          WHEN s.plan_type = 'trial' THEN EXTRACT(EPOCH FROM (s.trial_end_date - NOW())) / 86400
          ELSE NULL 
        END,
        'last_login', last_login.created_at,
        'days_since_last_login', COALESCE(
          EXTRACT(EPOCH FROM (NOW() - last_login.created_at)) / 86400,
          999
        ),
        'total_logins_30d', COALESCE(login_count.cnt, 0),
        'last_import', last_import.created_at,
        'days_since_last_import', COALESCE(
          EXTRACT(EPOCH FROM (NOW() - last_import.created_at)) / 86400,
          999
        ),
        'total_operations', COALESCE(ops_count.cnt, 0),
        'sites_count', COALESCE(sites_count.cnt, 0),
        'churn_score', (
          -- Score de 0 à 100, plus élevé = plus de risque
          LEAST(100, GREATEST(0,
            -- Facteur 1: Jours depuis dernière connexion (max 30 points)
            LEAST(30, COALESCE(EXTRACT(EPOCH FROM (NOW() - last_login.created_at)) / 86400, 30)) +
            -- Facteur 2: Jours depuis dernier import (max 25 points)
            LEAST(25, COALESCE(EXTRACT(EPOCH FROM (NOW() - last_import.created_at)) / 86400 * 0.5, 25)) +
            -- Facteur 3: Faible activité (peu de connexions en 30j) (max 15 points)
            CASE WHEN COALESCE(login_count.cnt, 0) < 3 THEN 15
                 WHEN COALESCE(login_count.cnt, 0) < 7 THEN 10
                 WHEN COALESCE(login_count.cnt, 0) < 14 THEN 5
                 ELSE 0 END +
            -- Facteur 4: Trial proche de l'expiration sans paiement (max 20 points)
            CASE WHEN s.plan_type = 'trial' AND s.trial_end_date <= NOW() + interval '3 days' THEN 20
                 WHEN s.plan_type = 'trial' AND s.trial_end_date <= NOW() + interval '7 days' THEN 15
                 WHEN s.plan_type = 'trial' THEN 10
                 ELSE 0 END +
            -- Facteur 5: Peu de données importées (max 10 points)
            CASE WHEN COALESCE(ops_count.cnt, 0) < 10 THEN 10
                 WHEN COALESCE(ops_count.cnt, 0) < 50 THEN 5
                 ELSE 0 END
          ))
        ),
        'risk_level', CASE 
          WHEN (
            LEAST(30, COALESCE(EXTRACT(EPOCH FROM (NOW() - last_login.created_at)) / 86400, 30)) +
            LEAST(25, COALESCE(EXTRACT(EPOCH FROM (NOW() - last_import.created_at)) / 86400 * 0.5, 25)) +
            CASE WHEN COALESCE(login_count.cnt, 0) < 3 THEN 15
                 WHEN COALESCE(login_count.cnt, 0) < 7 THEN 10
                 WHEN COALESCE(login_count.cnt, 0) < 14 THEN 5
                 ELSE 0 END +
            CASE WHEN s.plan_type = 'trial' AND s.trial_end_date <= NOW() + interval '3 days' THEN 20
                 WHEN s.plan_type = 'trial' AND s.trial_end_date <= NOW() + interval '7 days' THEN 15
                 WHEN s.plan_type = 'trial' THEN 10
                 ELSE 0 END +
            CASE WHEN COALESCE(ops_count.cnt, 0) < 10 THEN 10
                 WHEN COALESCE(ops_count.cnt, 0) < 50 THEN 5
                 ELSE 0 END
          ) >= 70 THEN 'critical'
          WHEN (
            LEAST(30, COALESCE(EXTRACT(EPOCH FROM (NOW() - last_login.created_at)) / 86400, 30)) +
            LEAST(25, COALESCE(EXTRACT(EPOCH FROM (NOW() - last_import.created_at)) / 86400 * 0.5, 25)) +
            CASE WHEN COALESCE(login_count.cnt, 0) < 3 THEN 15
                 WHEN COALESCE(login_count.cnt, 0) < 7 THEN 10
                 WHEN COALESCE(login_count.cnt, 0) < 14 THEN 5
                 ELSE 0 END +
            CASE WHEN s.plan_type = 'trial' AND s.trial_end_date <= NOW() + interval '3 days' THEN 20
                 WHEN s.plan_type = 'trial' AND s.trial_end_date <= NOW() + interval '7 days' THEN 15
                 WHEN s.plan_type = 'trial' THEN 10
                 ELSE 0 END +
            CASE WHEN COALESCE(ops_count.cnt, 0) < 10 THEN 10
                 WHEN COALESCE(ops_count.cnt, 0) < 50 THEN 5
                 ELSE 0 END
          ) >= 50 THEN 'high'
          WHEN (
            LEAST(30, COALESCE(EXTRACT(EPOCH FROM (NOW() - last_login.created_at)) / 86400, 30)) +
            LEAST(25, COALESCE(EXTRACT(EPOCH FROM (NOW() - last_import.created_at)) / 86400 * 0.5, 25)) +
            CASE WHEN COALESCE(login_count.cnt, 0) < 3 THEN 15
                 WHEN COALESCE(login_count.cnt, 0) < 7 THEN 10
                 WHEN COALESCE(login_count.cnt, 0) < 14 THEN 5
                 ELSE 0 END +
            CASE WHEN s.plan_type = 'trial' AND s.trial_end_date <= NOW() + interval '3 days' THEN 20
                 WHEN s.plan_type = 'trial' AND s.trial_end_date <= NOW() + interval '7 days' THEN 15
                 WHEN s.plan_type = 'trial' THEN 10
                 ELSE 0 END +
            CASE WHEN COALESCE(ops_count.cnt, 0) < 10 THEN 10
                 WHEN COALESCE(ops_count.cnt, 0) < 50 THEN 5
                 ELSE 0 END
          ) >= 30 THEN 'medium'
          ELSE 'low'
        END,
        'risk_factors', ARRAY_REMOVE(ARRAY[
          CASE WHEN COALESCE(EXTRACT(EPOCH FROM (NOW() - last_login.created_at)) / 86400, 999) > 14 
               THEN 'Inactif depuis +14 jours' END,
          CASE WHEN COALESCE(EXTRACT(EPOCH FROM (NOW() - last_import.created_at)) / 86400, 999) > 30 
               THEN 'Aucun import depuis +30 jours' END,
          CASE WHEN COALESCE(login_count.cnt, 0) < 3 
               THEN 'Très peu de connexions' END,
          CASE WHEN s.plan_type = 'trial' AND s.trial_end_date <= NOW() + interval '3 days' 
               THEN 'Trial expire dans -3 jours' END,
          CASE WHEN s.plan_type = 'trial' AND s.trial_end_date > NOW() + interval '3 days' AND s.trial_end_date <= NOW() + interval '7 days'
               THEN 'Trial expire dans -7 jours' END,
          CASE WHEN COALESCE(ops_count.cnt, 0) < 10 
               THEN 'Très peu de données importées' END
        ], NULL)
      ) AS prediction,
      (
        LEAST(30, COALESCE(EXTRACT(EPOCH FROM (NOW() - last_login.created_at)) / 86400, 30)) +
        LEAST(25, COALESCE(EXTRACT(EPOCH FROM (NOW() - last_import.created_at)) / 86400 * 0.5, 25)) +
        CASE WHEN COALESCE(login_count.cnt, 0) < 3 THEN 15
             WHEN COALESCE(login_count.cnt, 0) < 7 THEN 10
             WHEN COALESCE(login_count.cnt, 0) < 14 THEN 5
             ELSE 0 END +
        CASE WHEN s.plan_type = 'trial' AND s.trial_end_date <= NOW() + interval '3 days' THEN 20
             WHEN s.plan_type = 'trial' AND s.trial_end_date <= NOW() + interval '7 days' THEN 15
             WHEN s.plan_type = 'trial' THEN 10
             ELSE 0 END +
        CASE WHEN COALESCE(ops_count.cnt, 0) < 10 THEN 10
             WHEN COALESCE(ops_count.cnt, 0) < 50 THEN 5
             ELSE 0 END
      ) AS churn_score
    FROM public.subscriptions s
    JOIN public.profiles p ON p.id = s.user_id
    -- Dernière connexion
    LEFT JOIN LATERAL (
      SELECT created_at 
      FROM public.login_logs 
      WHERE user_id = s.user_id 
      ORDER BY created_at DESC 
      LIMIT 1
    ) last_login ON true
    -- Nombre de connexions sur 30 jours
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS cnt 
      FROM public.login_logs 
      WHERE user_id = s.user_id 
        AND created_at >= NOW() - interval '30 days'
    ) login_count ON true
    -- Dernier import
    LEFT JOIN LATERAL (
      SELECT created_at 
      FROM public.import_batches 
      WHERE user_id = s.user_id 
      ORDER BY created_at DESC 
      LIMIT 1
    ) last_import ON true
    -- Nombre total d'opérations
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS cnt 
      FROM public.operations 
      WHERE user_id = s.user_id
    ) ops_count ON true
    -- Nombre de sites
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS cnt 
      FROM public.sites 
      WHERE user_id = s.user_id AND is_demo = false
    ) sites_count ON true
    WHERE s.status = 'active'
  ) t
  INTO result;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;
