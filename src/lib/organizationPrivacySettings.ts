import { supabase } from "@/integrations/supabase/client";

export type OrganizationPrivacySettings = {
  organization_id: string;
  allow_anonymous_site_data: boolean;
  decided_at: string | null;
  decided_by_user_id: string | null;
  updated_at: string;
};

export type OrganizationPrivacySettingsWithUser = OrganizationPrivacySettings & {
  decided_by_user?: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  } | null;
};

type PrivacyPayload = {
  organization_id: string;
  allow_anonymous_site_data: boolean;
  decided_at: string;
  decided_by_user_id: string;
};

export async function getOrganizationPrivacySettings(organizationId: string): Promise<OrganizationPrivacySettingsWithUser | null> {
  const { data, error } = await supabase
    .from("organization_privacy_settings")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  // Fetch the user who made the decision
  let decidedByUser = null;
  if (data.decided_by_user_id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, last_name, email")
      .eq("id", data.decided_by_user_id)
      .maybeSingle();
    decidedByUser = profile;
  }

  return {
    ...data,
    decided_by_user: decidedByUser,
  };
}

export async function upsertOrganizationPrivacySettings(params: {
  organizationId: string;
  allowAnonymousSiteData: boolean;
  decidedByUserId: string;
}): Promise<OrganizationPrivacySettings> {
  const payload: PrivacyPayload = {
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
