-- TABLE: organization_privacy_settings
CREATE TABLE IF NOT EXISTS public.organization_privacy_settings (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  allow_anonymous_site_data boolean NOT NULL DEFAULT false,
  decided_at timestamptz,
  decided_by_user_id uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- updated_at trigger (reuse existing function if available, otherwise create)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_organization_privacy_settings_updated_at ON public.organization_privacy_settings;
CREATE TRIGGER trg_organization_privacy_settings_updated_at
BEFORE UPDATE ON public.organization_privacy_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.organization_privacy_settings ENABLE ROW LEVEL SECURITY;

-- SELECT: any organization member can read privacy settings
CREATE POLICY "organization members can read privacy settings"
ON public.organization_privacy_settings
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.organization_id = organization_privacy_settings.organization_id
      AND ur.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1
    FROM public.organizations o
    WHERE o.id = organization_privacy_settings.organization_id
      AND o.owner_id = auth.uid()
  )
);

-- INSERT/UPDATE/DELETE: admins/owners only
CREATE POLICY "organization admins can manage privacy settings"
ON public.organization_privacy_settings
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.organization_id = organization_privacy_settings.organization_id
      AND ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin', 'company_admin')
  )
  OR
  EXISTS (
    SELECT 1
    FROM public.organizations o
    WHERE o.id = organization_privacy_settings.organization_id
      AND o.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.organization_id = organization_privacy_settings.organization_id
      AND ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin', 'company_admin')
  )
  OR
  EXISTS (
    SELECT 1
    FROM public.organizations o
    WHERE o.id = organization_privacy_settings.organization_id
      AND o.owner_id = auth.uid()
  )
);