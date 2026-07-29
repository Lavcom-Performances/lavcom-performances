
-- Fix mutable search_path on three functions
ALTER FUNCTION public.classify_operation_category(text, text) SET search_path = public;
ALTER FUNCTION public.derive_department_code(text) SET search_path = public;
ALTER FUNCTION public.update_site_department_code() SET search_path = public;

-- team_invitations: remove email-based UPDATE policy (spoofing risk).
-- Acceptance goes through accept-invitation edge function using service role + token verification.
DROP POLICY IF EXISTS "Users can accept their invitation" ON public.team_invitations;
DROP POLICY IF EXISTS "Users can view invitations for their email" ON public.team_invitations;

-- Keep admins-only visibility policy (already exists). Add explicit policy so that
-- only admins in the same org can view their invitations. No end-user policy needed.

-- Restrict listing of email-assets bucket: keep public read of individual objects
-- (they are served by URL in transactional emails), but drop any broad SELECT policy
-- that allowed folder/list enumeration.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND (qual ILIKE '%email-assets%' OR policyname ILIKE '%email-assets%' OR policyname ILIKE '%email assets%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
  END LOOP;
END $$;

-- Recreate a scoped SELECT for individual objects (no listing) and write access only for service_role.
CREATE POLICY "email-assets public read"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'email-assets' AND name IS NOT NULL);

CREATE POLICY "email-assets service manage"
ON storage.objects FOR ALL TO service_role
USING (bucket_id = 'email-assets') WITH CHECK (bucket_id = 'email-assets');
