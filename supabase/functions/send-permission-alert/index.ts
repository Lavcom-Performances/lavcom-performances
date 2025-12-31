import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-PERMISSION-ALERT] ${step}${detailsStr}`);
};

interface PermissionAlertRequest {
  organizationId: string;
  action: string;
  performerEmail: string;
  targetEmail: string;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
}

const ACTION_LABELS: Record<string, string> = {
  permission_updated: "Permission modifiée",
  role_changed: "Rôle modifié",
  permissions_reset: "Permissions réinitialisées",
  all_permissions_granted: "Tous les droits accordés",
  all_permissions_revoked: "Tous les droits révoqués",
};

const formatChanges = (oldValues: Record<string, unknown> | null, newValues: Record<string, unknown> | null): string => {
  if (!oldValues && !newValues) return "";
  
  const changes: string[] = [];
  
  if (oldValues && newValues) {
    Object.keys(newValues).forEach(key => {
      const oldVal = oldValues[key];
      const newVal = newValues[key];
      if (oldVal !== newVal) {
        const label = key.replace(/^can_/, '').replace(/_/g, ' ');
        changes.push(`<li><strong>${label}</strong>: ${oldVal ? '✅' : '❌'} → ${newVal ? '✅' : '❌'}</li>`);
      }
    });
  } else if (newValues) {
    Object.entries(newValues).forEach(([key, value]) => {
      const label = key.replace(/^can_/, '').replace(/_/g, ' ');
      changes.push(`<li><strong>${label}</strong>: ${value ? '✅ Accordé' : '❌ Révoqué'}</li>`);
    });
  }
  
  return changes.length > 0 ? `<ul style="margin: 10px 0; padding-left: 20px;">${changes.join('')}</ul>` : "";
};

const formatChangesForSlack = (oldValues: Record<string, unknown> | null, newValues: Record<string, unknown> | null): string => {
  if (!oldValues && !newValues) return "";
  
  const changes: string[] = [];
  
  if (oldValues && newValues) {
    Object.keys(newValues).forEach(key => {
      const oldVal = oldValues[key];
      const newVal = newValues[key];
      if (oldVal !== newVal) {
        const label = key.replace(/^can_/, '').replace(/_/g, ' ');
        changes.push(`• *${label}*: ${oldVal ? '✅' : '❌'} → ${newVal ? '✅' : '❌'}`);
      }
    });
  } else if (newValues) {
    Object.entries(newValues).forEach(([key, value]) => {
      const label = key.replace(/^can_/, '').replace(/_/g, ' ');
      changes.push(`• *${label}*: ${value ? '✅ Accordé' : '❌ Révoqué'}`);
    });
  }
  
  return changes.join('\n');
};

interface CustomWebhook {
  id: string;
  name: string;
  url: string;
  type: string;
}

const sendCustomWebhook = async (
  webhook: CustomWebhook,
  action: string,
  performerEmail: string,
  targetEmail: string,
  oldValues: Record<string, unknown> | null,
  newValues: Record<string, unknown> | null
): Promise<boolean> => {
  const actionLabel = ACTION_LABELS[action] || action;
  const timestamp = new Date().toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' });

  let payload: unknown;

  if (webhook.type === 'discord') {
    // Discord webhook format
    const changesText = formatChangesForSlack(oldValues, newValues);
    payload = {
      username: "Lavcom Sécurité",
      avatar_url: "https://lavcom.fr/favicon.ico",
      embeds: [{
        title: "🔐 Modification de permissions",
        color: 0x7c3aed, // Purple
        fields: [
          { name: "Action", value: actionLabel, inline: true },
          { name: "Date", value: timestamp, inline: true },
          { name: "Effectué par", value: performerEmail, inline: false },
          { name: "Utilisateur cible", value: targetEmail, inline: false },
          ...(changesText ? [{ name: "Modifications", value: changesText, inline: false }] : []),
        ],
        footer: { text: "⚠️ Vérifiez si vous n'êtes pas à l'origine de cette modification" }
      }]
    };
  } else if (webhook.type === 'teams') {
    // Microsoft Teams webhook format (Adaptive Card)
    const changesText = formatChangesForSlack(oldValues, newValues);
    payload = {
      "@type": "MessageCard",
      "@context": "http://schema.org/extensions",
      themeColor: "7c3aed",
      summary: `Alerte Sécurité - ${actionLabel}`,
      sections: [{
        activityTitle: "🔐 Modification de permissions",
        facts: [
          { name: "Action", value: actionLabel },
          { name: "Date", value: timestamp },
          { name: "Effectué par", value: performerEmail },
          { name: "Utilisateur cible", value: targetEmail },
          ...(changesText ? [{ name: "Modifications", value: changesText }] : []),
        ],
        markdown: true
      }],
      potentialAction: [{
        "@type": "OpenUri",
        name: "Voir les logs",
        targets: [{ os: "default", uri: "https://lavcom.fr/roles-management" }]
      }]
    };
  } else {
    // Generic JSON payload for custom webhooks
    payload = {
      event: "permission_change",
      action,
      actionLabel,
      timestamp,
      performerEmail,
      targetEmail,
      oldValues,
      newValues,
      source: "lavcom"
    };
  }

  try {
    const response = await fetch(webhook.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      logStep(`Custom webhook ${webhook.name} failed`, { status: response.status, type: webhook.type });
      return false;
    }

    logStep(`Custom webhook ${webhook.name} sent successfully`, { type: webhook.type });
    return true;
  } catch (error) {
    logStep(`Custom webhook ${webhook.name} error`, { error: String(error), type: webhook.type });
    return false;
  }
};

const sendSlackAlert = async (
  action: string,
  performerEmail: string,
  targetEmail: string,
  oldValues: Record<string, unknown> | null,
  newValues: Record<string, unknown> | null
): Promise<boolean> => {
  const slackWebhookUrl = Deno.env.get("SLACK_WEBHOOK_URL");
  
  if (!slackWebhookUrl) {
    logStep("Slack webhook URL not configured, skipping Slack notification");
    return false;
  }

  const actionLabel = ACTION_LABELS[action] || action;
  const changesText = formatChangesForSlack(oldValues, newValues);
  const timestamp = new Date().toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' });

  const slackMessage = {
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "🔐 Alerte Sécurité - Modification de permissions",
          emoji: true
        }
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Action:*\n${actionLabel}`
          },
          {
            type: "mrkdwn",
            text: `*Date:*\n${timestamp}`
          },
          {
            type: "mrkdwn",
            text: `*Effectué par:*\n${performerEmail}`
          },
          {
            type: "mrkdwn",
            text: `*Utilisateur cible:*\n${targetEmail}`
          }
        ]
      },
      ...(changesText ? [
        {
          type: "divider"
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Modifications:*\n${changesText}`
          }
        }
      ] : []),
      {
        type: "divider"
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "📋 Voir les logs d'audit",
              emoji: true
            },
            url: "https://lavcom.fr/roles-management",
            style: "primary"
          }
        ]
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: "⚠️ Si vous n'êtes pas à l'origine de cette modification, veuillez vérifier immédiatement."
          }
        ]
      }
    ]
  };

  try {
    const response = await fetch(slackWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(slackMessage),
    });

    if (!response.ok) {
      logStep("Slack webhook failed", { status: response.status });
      return false;
    }

    logStep("Slack notification sent successfully");
    return true;
  } catch (error) {
    logStep("Slack notification error", { error: String(error) });
    return false;
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { organizationId, action, performerEmail, targetEmail, oldValues, newValues }: PermissionAlertRequest = await req.json();

    if (!organizationId || !action) {
      throw new Error("Missing required fields: organizationId, action");
    }

    logStep("Processing alert", { organizationId, action, performerEmail, targetEmail });

    // Send Slack notification (fire and forget, don't block on it)
    const slackPromise = sendSlackAlert(action, performerEmail, targetEmail, oldValues, newValues);

    // Fetch custom webhooks for the organization
    const { data: customWebhooks, error: webhooksError } = await supabase
      .from('permission_webhooks')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_enabled', true);

    if (webhooksError) {
      logStep("Error fetching custom webhooks", webhooksError);
    }

    // Send to custom webhooks
    const customWebhookPromises = (customWebhooks || []).map(webhook => 
      sendCustomWebhook(webhook, action, performerEmail, targetEmail, oldValues, newValues)
    );

    // Fetch super admin emails from the organization
    const { data: superAdminRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('organization_id', organizationId)
      .eq('role', 'super_admin');

    if (rolesError) {
      logStep("Error fetching super admin roles", rolesError);
      throw new Error("Failed to fetch super admin roles");
    }

    if (!superAdminRoles || superAdminRoles.length === 0) {
      logStep("No super admins found");
      const [slackSent, ...webhookResults] = await Promise.all([slackPromise, ...customWebhookPromises]);
      const webhooksSent = webhookResults.filter(Boolean).length;
      return new Response(JSON.stringify({ success: true, message: "No super admins to notify", slackSent, webhooksSent }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const superAdminIds = superAdminRoles.map(r => r.user_id);

    // Fetch super admin emails
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('email')
      .in('id', superAdminIds);

    if (profilesError) {
      logStep("Error fetching profiles", profilesError);
      throw new Error("Failed to fetch super admin emails");
    }

    const recipientEmails = profiles?.map(p => p.email).filter(Boolean) || [];

    if (recipientEmails.length === 0) {
      logStep("No recipient emails found");
      const [slackSent, ...webhookResults] = await Promise.all([slackPromise, ...customWebhookPromises]);
      const webhooksSent = webhookResults.filter(Boolean).length;
      return new Response(JSON.stringify({ success: true, message: "No valid recipient emails", slackSent, webhooksSent }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Sending emails to", { count: recipientEmails.length });

    const actionLabel = ACTION_LABELS[action] || action;
    const changesHtml = formatChanges(oldValues, newValues);
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "Lavcom <noreply@lavcom.fr>";

    const emailPromises = recipientEmails.map(email =>
      resend.emails.send({
        from: fromEmail,
        to: [email],
        subject: `🔐 Alerte sécurité - ${actionLabel}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #7c3aed; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 20px;">🔐 Modification de permissions</h1>
            </div>
            <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
              <p style="margin-top: 0;">Une modification sensible a été effectuée dans votre organisation :</p>
              
              <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; width: 120px;">Action :</td>
                  <td style="padding: 8px 0; font-weight: bold;">${actionLabel}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Effectuée par :</td>
                  <td style="padding: 8px 0;">${performerEmail}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Utilisateur cible :</td>
                  <td style="padding: 8px 0;">${targetEmail}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Date :</td>
                  <td style="padding: 8px 0;">${new Date().toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' })}</td>
                </tr>
              </table>

              ${changesHtml ? `
                <div style="background: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 15px; margin-top: 15px;">
                  <p style="margin: 0 0 10px 0; font-weight: bold; color: #374151;">Modifications :</p>
                  ${changesHtml}
                </div>
              ` : ''}

              <p style="margin-top: 20px;">
                <a href="https://lavcom.fr/roles-management" style="background: #7c3aed; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  Voir les logs d'audit
                </a>
              </p>

              <p style="color: #6b7280; font-size: 12px; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 15px;">
                Cet email est envoyé automatiquement aux Super Admins de votre organisation.<br>
                Si vous n'êtes pas à l'origine de cette modification, veuillez vérifier immédiatement.
              </p>
            </div>
          </div>
        `,
      })
    );

    const [emailResults, slackSent, ...webhookResults] = await Promise.all([
      Promise.allSettled(emailPromises),
      slackPromise,
      ...customWebhookPromises
    ]);

    const successCount = emailResults.filter(r => r.status === 'fulfilled').length;
    const failCount = emailResults.filter(r => r.status === 'rejected').length;
    const webhooksSent = webhookResults.filter(Boolean).length;

    logStep("Notifications sent", { emailSuccessCount: successCount, emailFailCount: failCount, slackSent, webhooksSent });

    return new Response(JSON.stringify({ success: true, successCount, failCount, slackSent, webhooksSent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
