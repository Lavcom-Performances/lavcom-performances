import { supabase } from "@/integrations/supabase/client";

export type OrganizationPrivacySettings = {
  organization_id: string;
  allow_anonymous_site_data: boolean;
  decided_at: string | null;
  decided_by_user_id: string | null;
  updated_at: string;
};

export async function getOrganizationPrivacySettings(organizationId: string) {
  const { data, error } = await supabase
    .from("organization_privacy_settings")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) throw error;
  return data as OrganizationPrivacySettings | null;
}

export async function upsertOrganizationPrivacySettings(params: {
  organizationId: string;
  allowAnonymousSiteData: boolean;
  decidedByUserId: string;
}) {
  const payload = {
    organization_id: params.organizationId,
    allow_anonymous_site_data: params.allowAnonymousSiteData,
    decided_at: new Date().toISOString(),
    decided_by_user_id: params.decidedByUserId,
  };

  const { data, error } = await supabase
    .from("organization_privacy_settings")
    .upsert(payload, { onConflict: "organization_id" })
    .select("*")
    .single();

  if (error) throw error;
  return data as OrganizationPrivacySettings;
}
