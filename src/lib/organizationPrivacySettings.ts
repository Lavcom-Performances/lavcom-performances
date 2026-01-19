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

async function logPrivacyConsentChange(params: {
  organizationId: string;
  performedBy: string;
  oldValue: boolean | null;
  newValue: boolean;
}): Promise<void> {
  const action = params.newValue ? 'consent_granted' : 'consent_revoked';
  
  const { error } = await supabase
    .from("privacy_consent_audit_logs")
    .insert({
      organization_id: params.organizationId,
      performed_by: params.performedBy,
      action,
      old_value: params.oldValue,
      new_value: params.newValue,
    });

  if (error) {
    console.error("Failed to log privacy consent change:", error);
    // Don't throw - logging failure shouldn't block the main operation
  }
}

async function sendPrivacyConsentAlert(params: {
  organizationId: string;
  organizationName: string;
  userName: string;
  userEmail: string;
  newValue: boolean;
}): Promise<void> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing Supabase environment variables for alert");
    return;
  }

  const action = params.newValue ? 'accordé' : 'révoqué';
  
  try {
    await fetch(`${supabaseUrl}/functions/v1/send-system-alert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        id: Date.now(),
        created_at: new Date().toISOString(),
        env: import.meta.env.MODE || 'production',
        source: 'privacy-consent',
        severity: 'info',
        code: 'PRIVACY_CONSENT_CHANGE',
        message: `Consentement vie privée ${action} pour l'organisation "${params.organizationName}"`,
        meta: {
          organization_id: params.organizationId,
          organization_name: params.organizationName,
          user_name: params.userName,
          user_email: params.userEmail,
          consent_granted: params.newValue,
        },
      }),
    });
  } catch (error) {
    console.error("Failed to send privacy consent alert:", error);
    // Don't throw - alert failure shouldn't block the main operation
  }
}

export async function upsertOrganizationPrivacySettings(params: {
  organizationId: string;
  allowAnonymousSiteData: boolean;
  decidedByUserId: string;
}): Promise<OrganizationPrivacySettings> {
  // Get current settings to determine if this is a change
  const currentSettings = await getOrganizationPrivacySettings(params.organizationId);
  const oldValue = currentSettings?.allow_anonymous_site_data ?? null;
  const isChange = oldValue !== params.allowAnonymousSiteData;

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

  // Log and notify only if there was an actual change
  if (isChange) {
    // Log the change
    await logPrivacyConsentChange({
      organizationId: params.organizationId,
      performedBy: params.decidedByUserId,
      oldValue,
      newValue: params.allowAnonymousSiteData,
    });

    // Get user and organization info for the alert
    const [userResult, orgResult] = await Promise.all([
      supabase.from("profiles").select("first_name, last_name, email").eq("id", params.decidedByUserId).maybeSingle(),
      supabase.from("organizations").select("name").eq("id", params.organizationId).maybeSingle(),
    ]);

    const userName = userResult.data 
      ? `${userResult.data.first_name || ''} ${userResult.data.last_name || ''}`.trim() || userResult.data.email
      : 'Unknown user';
    const userEmail = userResult.data?.email || '';
    const organizationName = orgResult.data?.name || 'Unknown organization';

    // Send alert to admins
    await sendPrivacyConsentAlert({
      organizationId: params.organizationId,
      organizationName,
      userName,
      userEmail,
      newValue: params.allowAnonymousSiteData,
    });
  }

  return data as OrganizationPrivacySettings;
}

export async function getPrivacyConsentAuditLogs(organizationId: string): Promise<Array<{
  id: string;
  action: string;
  old_value: boolean | null;
  new_value: boolean;
  created_at: string;
  performed_by_user?: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  } | null;
}>> {
  const { data, error } = await supabase
    .from("privacy_consent_audit_logs")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  if (!data) return [];

  // Fetch user info for each log entry
  const userIds = [...new Set(data.map(log => log.performed_by))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email")
    .in("id", userIds);

  const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

  return data.map(log => ({
    id: log.id,
    action: log.action,
    old_value: log.old_value,
    new_value: log.new_value,
    created_at: log.created_at,
    performed_by_user: profilesMap.get(log.performed_by) || null,
  }));
}
