-- Mettre à jour la fonction handle_new_user pour créer l'essai 14 jours automatiquement
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, first_name, last_name, company_name)
  VALUES (
    NEW.id, 
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'company_name'
  );
  
  -- Create trial subscription with 14 days
  INSERT INTO public.subscriptions (
    user_id, 
    plan_type, 
    status, 
    trial_start_date, 
    trial_end_date,
    laundry_count
  )
  VALUES (
    NEW.id, 
    'trial', 
    'active',
    NOW(),
    NOW() + INTERVAL '14 days',
    1
  );
  
  RETURN NEW;
END;
$function$;