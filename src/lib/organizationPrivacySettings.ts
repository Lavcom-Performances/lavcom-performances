import { supabase } from "@/integrations/supabase/client";

export type OrganizationPrivacySettings = {
  organization_id: string;
  allow_anonymous_site_data: boolean;
  decided_at: string | null;
  decided_by_user_id: string | null;
  updated_at: string;
};

type PrivacyPayload = {
  organization_id: string;
  allow_anonymous_site_data: boolean;
  decided_at: string;
  decided_by_user_id: string;
};

export async function getOrganizationPrivacySettings(organizationId: string): Promise<OrganizationPrivacySettings | null> {
  // Using type assertion since table was just created and types haven't regenerated yet
  const { data, error } = await (supabase as unknown as {
    from: (table: string) => {
      select: (columns: string) => {
        eq: (column: string, value: string) => {
          maybeSingle: () => Promise<{ data: OrganizationPrivacySettings | null; error: Error | null }>;
        };
      };
    };
  }).from("organization_privacy_settings")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) throw error;
  return data;
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

  // Using type assertion since table was just created and types haven't regenerated yet
  const { data, error } = await (supabase as unknown as {
    from: (table: string) => {
      upsert: (payload: PrivacyPayload, options: { onConflict: string }) => {
        select: (columns: string) => {
          single: () => Promise<{ data: OrganizationPrivacySettings | null; error: Error | null }>;
        };
      };
    };
  }).from("organization_privacy_settings")
    .upsert(payload, { onConflict: "organization_id" })
    .select("*")
    .single();

  if (error) throw error;
  return data as OrganizationPrivacySettings;
}
