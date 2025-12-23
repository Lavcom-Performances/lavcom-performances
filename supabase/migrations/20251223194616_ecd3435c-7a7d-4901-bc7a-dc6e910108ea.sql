-- Drop the problematic SELECT policy on organizations
DROP POLICY IF EXISTS "Users can view their organizations" ON public.organizations;

-- Recreate with a policy that allows both:
-- 1. The owner to always see their organization
-- 2. Members (via user_roles) to see the organization
CREATE POLICY "Users can view their organizations"
ON public.organizations
FOR SELECT
USING (
  owner_id = auth.uid() 
  OR EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_roles.organization_id = organizations.id 
    AND user_roles.user_id = auth.uid()
  )
);