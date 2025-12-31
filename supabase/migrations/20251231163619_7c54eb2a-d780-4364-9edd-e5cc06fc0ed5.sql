-- Create table for custom user permissions
CREATE TABLE public.user_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Site permissions
  can_view_sites BOOLEAN NOT NULL DEFAULT true,
  can_edit_sites BOOLEAN NOT NULL DEFAULT false,
  can_delete_sites BOOLEAN NOT NULL DEFAULT false,
  -- Data permissions
  can_import_data BOOLEAN NOT NULL DEFAULT false,
  can_export_data BOOLEAN NOT NULL DEFAULT false,
  can_delete_data BOOLEAN NOT NULL DEFAULT false,
  -- Report permissions
  can_view_reports BOOLEAN NOT NULL DEFAULT true,
  can_export_reports BOOLEAN NOT NULL DEFAULT false,
  -- Team permissions
  can_invite_members BOOLEAN NOT NULL DEFAULT false,
  can_manage_roles BOOLEAN NOT NULL DEFAULT false,
  -- Billing permissions
  can_view_billing BOOLEAN NOT NULL DEFAULT false,
  can_manage_billing BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

-- Enable RLS
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view permissions in their organization
CREATE POLICY "Users can view permissions in their org"
ON public.user_permissions
FOR SELECT
USING (user_belongs_to_org(auth.uid(), organization_id));

-- Policy: Admins can manage permissions in their organization
CREATE POLICY "Admins can manage permissions"
ON public.user_permissions
FOR ALL
USING (is_org_admin(auth.uid(), organization_id))
WITH CHECK (is_org_admin(auth.uid(), organization_id));

-- Trigger for updated_at
CREATE TRIGGER update_user_permissions_updated_at
BEFORE UPDATE ON public.user_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();