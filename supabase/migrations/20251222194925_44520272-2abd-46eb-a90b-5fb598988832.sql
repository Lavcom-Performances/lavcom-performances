-- =============================================
-- SECURITY HARDENING: RLS POLICY FIXES
-- =============================================

-- 1. FIX CRITICAL: rate_limits policy is on 'public' role with USING(true)
-- This allows ANY user to manipulate rate limits!
DROP POLICY IF EXISTS "Service role full access" ON public.rate_limits;

-- Create proper service_role only policy
CREATE POLICY "Service role full access" 
ON public.rate_limits 
FOR ALL 
TO service_role
USING (true) 
WITH CHECK (true);

-- 2. FIX: login_logs INSERT should be service_role only (edge functions)
-- Remove public INSERT policy
DROP POLICY IF EXISTS "Users can insert their own login logs" ON public.login_logs;

-- Add service_role INSERT policy for login_logs
CREATE POLICY "Service role can insert login logs" 
ON public.login_logs 
FOR INSERT 
TO service_role
WITH CHECK (true);

-- 3. FIX: contact_messages - ensure anon cannot read
-- Already has service_role policies, but verify RLS is FORCE enabled
-- (RLS is already enabled, but policies only apply to service_role which is correct)

-- 4. FIX: purchases - ensure no public INSERT (webhook only)
-- Already has service_role ALL policy, remove any public INSERT if exists
-- (verified: only service_role can INSERT, users can only SELECT their own)

-- 5. REVOKE unnecessary grants from anon role on all sensitive tables
REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.purchases FROM anon;
REVOKE ALL ON public.login_logs FROM anon;
REVOKE ALL ON public.subscriptions FROM anon;
REVOKE ALL ON public.operations FROM anon;
REVOKE ALL ON public.sites FROM anon;
REVOKE ALL ON public.site_costs FROM anon;
REVOKE ALL ON public.user_goals FROM anon;
REVOKE ALL ON public.import_batches FROM anon;
REVOKE ALL ON public.rate_limits FROM anon;
REVOKE ALL ON public.contact_messages FROM anon;

-- 6. Ensure authenticated users have proper grants (RLS will filter)
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.purchases TO authenticated;
GRANT SELECT ON public.login_logs TO authenticated;
GRANT SELECT, UPDATE ON public.subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.operations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sites TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_costs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_goals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.import_batches TO authenticated;