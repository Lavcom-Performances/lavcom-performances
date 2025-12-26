-- Drop the overly permissive policy that exposes all invitation tokens
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON public.team_invitations;

-- Create a more restrictive policy:
-- - Org admins can view their organization's invitations
-- - Authenticated users can view invitations sent to their email
CREATE POLICY "Users can view invitations for their email"
ON public.team_invitations
FOR SELECT
USING (
  is_org_admin(auth.uid(), organization_id) 
  OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
);