-- Allow anyone to read their own invitation by token (for accepting invitations)
CREATE POLICY "Anyone can view invitation by token"
ON public.team_invitations
FOR SELECT
USING (true);

-- Drop the old admin-only select policy
DROP POLICY IF EXISTS "Admins can view invitations" ON public.team_invitations;

-- Recreate admin select policy to be more specific for listing
CREATE POLICY "Admins can view org invitations"
ON public.team_invitations
FOR SELECT
USING (is_org_admin(auth.uid(), organization_id));

-- Allow invited users to update their own invitation (to mark as accepted)
CREATE POLICY "Users can accept their invitation"
ON public.team_invitations
FOR UPDATE
USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
)
WITH CHECK (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Drop the old admin update policy
DROP POLICY IF EXISTS "Admins can update invitations" ON public.team_invitations;