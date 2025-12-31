-- Create table for custom webhooks
CREATE TABLE public.permission_webhooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'custom', -- 'discord', 'teams', 'slack', 'custom'
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  UNIQUE(organization_id, url)
);

-- Enable RLS
ALTER TABLE public.permission_webhooks ENABLE ROW LEVEL SECURITY;

-- Only super admins can manage webhooks
CREATE POLICY "Super admins can view webhooks"
ON public.permission_webhooks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.organization_id = permission_webhooks.organization_id
      AND user_roles.role = 'super_admin'
  )
);

CREATE POLICY "Super admins can create webhooks"
ON public.permission_webhooks
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.organization_id = permission_webhooks.organization_id
      AND user_roles.role = 'super_admin'
  )
);

CREATE POLICY "Super admins can update webhooks"
ON public.permission_webhooks
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.organization_id = permission_webhooks.organization_id
      AND user_roles.role = 'super_admin'
  )
);

CREATE POLICY "Super admins can delete webhooks"
ON public.permission_webhooks
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.organization_id = permission_webhooks.organization_id
      AND user_roles.role = 'super_admin'
  )
);

-- Add index for organization lookups
CREATE INDEX idx_permission_webhooks_org ON public.permission_webhooks(organization_id);

-- Add trigger for updated_at
CREATE TRIGGER update_permission_webhooks_updated_at
  BEFORE UPDATE ON public.permission_webhooks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();