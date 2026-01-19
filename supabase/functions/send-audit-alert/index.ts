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
  console.log(`[SEND-AUDIT-ALERT] ${step}${detailsStr}`);
};

// Critical actions that should trigger notifications
const CRITICAL_ACTIONS = [
  'DELETE',           // Any deletion
  'permission_updated',
  'role_changed',
  'permissions_reset',
  'all_permissions_granted',
  'all_permissions_revoked',
  'member_removed',
  'member_invited',
  'organization_updated',
];

// Critical tables that should trigger notifications on sensitive operations
const CRITICAL_TABLES = [
  'user_permissions',
  'user_roles',
  'organizations',
  'profiles',
  'sites',
  'subscriptions',
];

interface AuditAlertRequest {
  logId?: string;
  actorId: string | null;
  action: string;
  targetTable: string;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
}

interface AlertRecipient {
  email: string;
  userId: string;
}

const ACTION_LABELS: Record<string, string> = {
  INSERT: "Création",
  UPDATE: "Modification",
  DELETE: "Suppression",
  EXPORT: "Export",
  SELECT: "Consultation",
  permission_updated: "Permission modifiée",
  role_changed: "Rôle modifié",
  permissions_reset: "Permissions réinitialisées",
  all_permissions_granted: "Tous les droits accordés",
  all_permissions_revoked: "Tous les droits révoqués",
  member_removed: "Membre retiré",
  member_invited: "Membre invité",
  organization_updated: "Organisation modifiée",
};

const TABLE_LABELS: Record<string, string> = {
  sites: "Laverie",
  profiles: "Profil utilisateur",
  user_permissions: "Permissions utilisateur",
  user_roles: "Rôles utilisateur",
  operations: "Opération",
  organizations: "Organisation",
  subscriptions: "Abonnement",
  import_batches: "Import de données",
  site_costs: "Coûts laverie",
};

const getSeverityColor = (action: string): string => {
  if (action === 'DELETE' || action.includes('revoke') || action.includes('removed')) {
    return '#ef4444'; // Red
  }
  if (action === 'INSERT' || action.includes('grant') || action.includes('invited')) {
    return '#22c55e'; // Green
  }
  return '#f59e0b'; // Amber for updates
};

const formatMetadata = (metadata: Record<string, unknown> | null): string => {
  if (!metadata) return '';
  
  const entries = Object.entries(metadata)
    .filter(([key]) => !['timestamp', 'source', 'user_agent'].includes(key))
    .slice(0, 5);
  
  if (entries.length === 0) return '';
  
  return `
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-top: 15px;">
      <p style="margin: 0 0 8px 0; font-weight: 600; color: #475569; font-size: 13px;">Détails :</p>
      <ul style="margin: 0; padding-left: 18px; color: #64748b; font-size: 13px;">
        ${entries.map(([key, value]) => {
          const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          return `<li><strong>${label}</strong>: ${JSON.stringify(value)}</li>`;
        }).join('')}
      </ul>
    </div>
  `;
};

const sendSlackAlert = async (
  action: string,
  targetTable: string,
  actorEmail: string | null,
  metadata: Record<string, unknown> | null
): Promise<boolean> => {
  const slackWebhookUrl = Deno.env.get("SLACK_WEBHOOK_URL");
  
  if (!slackWebhookUrl) {
    logStep("Slack webhook URL not configured, skipping");
    return false;
  }

  const actionLabel = ACTION_LABELS[action] || action;
  const tableLabel = TABLE_LABELS[targetTable] || targetTable;
  const timestamp = new Date().toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' });

  const slackMessage = {
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `🔔 Action critique détectée`,
          emoji: true
        }
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Action:*\n${actionLabel}` },
          { type: "mrkdwn", text: `*Table:*\n${tableLabel}` },
          { type: "mrkdwn", text: `*Effectué par:*\n${actorEmail || 'Système'}` },
          { type: "mrkdwn", text: `*Date:*\n${timestamp}` }
        ]
      },
      {
        type: "context",
        elements: [
          { type: "mrkdwn", text: "⚠️ Cette action a été enregistrée dans les logs d'audit" }
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

    logStep("Slack notification sent");
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

    const { logId, actorId, action, targetTable, targetId, metadata }: AuditAlertRequest = await req.json();

    logStep("Processing audit alert", { action, targetTable, actorId });

    // Check if this is a critical action that should trigger an alert
    const isCriticalAction = CRITICAL_ACTIONS.includes(action);
    const isCriticalTable = CRITICAL_TABLES.includes(targetTable);
    const isDeleteOnCriticalTable = action === 'DELETE' && isCriticalTable;
    
    if (!isCriticalAction && !isDeleteOnCriticalTable) {
      logStep("Non-critical action, skipping notification", { action, targetTable });
      return new Response(JSON.stringify({ success: true, skipped: true, reason: 'not_critical' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Get actor email if available
    let actorEmail: string | null = null;
    if (actorId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', actorId)
        .single();
      actorEmail = profile?.email || null;
    }

    // Send Slack notification (fire and forget)
    const slackPromise = sendSlackAlert(action, targetTable, actorEmail, metadata);

    // Get platform admins to notify
    const { data: platformAdmins, error: adminsError } = await supabase
      .from('platform_roles')
      .select('user_id')
      .in('role', ['super_admin', 'admin']);

    if (adminsError) {
      logStep("Error fetching platform admins", adminsError);
    }

    const adminIds = platformAdmins?.map(a => a.user_id) || [];
    
    // Get admin emails
    let recipients: AlertRecipient[] = [];
    if (adminIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', adminIds);
      
      recipients = (profiles || [])
        .filter(p => p.email)
        .map(p => ({ userId: p.id, email: p.email }));
    }

    // Also add RESEND_TO_EMAIL as a fallback recipient
    const fallbackEmail = Deno.env.get("RESEND_TO_EMAIL");
    if (fallbackEmail && !recipients.some(r => r.email === fallbackEmail)) {
      recipients.push({ userId: 'system', email: fallbackEmail });
    }

    if (recipients.length === 0) {
      logStep("No recipients to notify");
      const slackSent = await slackPromise;
      return new Response(JSON.stringify({ success: true, message: "No recipients to notify", slackSent }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Sending emails to", { count: recipients.length });

    const actionLabel = ACTION_LABELS[action] || action;
    const tableLabel = TABLE_LABELS[targetTable] || targetTable;
    const severityColor = getSeverityColor(action);
    const metadataHtml = formatMetadata(metadata);
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "Lavcom <noreply@lavcom.fr>";
    const timestamp = new Date().toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' });

    const emailPromises = recipients.map(recipient =>
      resend.emails.send({
        from: fromEmail,
        to: [recipient.email],
        subject: `🔔 Action critique - ${actionLabel} sur ${tableLabel}`,
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
            <div style="background: ${severityColor}; color: white; padding: 24px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 600;">
                🔔 Action critique détectée
              </h1>
              <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 14px;">
                Une action sensible a été enregistrée dans les logs d'audit
              </p>
            </div>
            
            <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; color: #64748b; width: 130px; font-size: 14px;">Action :</td>
                  <td style="padding: 10px 0; font-weight: 600; color: #1e293b; font-size: 14px;">${actionLabel}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #64748b; font-size: 14px;">Table concernée :</td>
                  <td style="padding: 10px 0; color: #1e293b; font-size: 14px;">${tableLabel}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #64748b; font-size: 14px;">Effectué par :</td>
                  <td style="padding: 10px 0; color: #1e293b; font-size: 14px;">${actorEmail || 'Système'}</td>
                </tr>
                ${targetId ? `
                <tr>
                  <td style="padding: 10px 0; color: #64748b; font-size: 14px;">ID cible :</td>
                  <td style="padding: 10px 0; color: #1e293b; font-size: 14px; font-family: monospace;">${targetId}</td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 10px 0; color: #64748b; font-size: 14px;">Date :</td>
                  <td style="padding: 10px 0; color: #1e293b; font-size: 14px;">${timestamp}</td>
                </tr>
              </table>

              ${metadataHtml}

              <div style="margin-top: 24px;">
                <a href="https://lavcom.fr/admin/audit-logs" 
                   style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500; font-size: 14px;">
                  Voir les logs d'audit
                </a>
              </div>

              <p style="color: #94a3b8; font-size: 12px; margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
                Cet email est envoyé automatiquement aux administrateurs de la plateforme.<br>
                Si vous n'êtes pas à l'origine de cette action, veuillez vérifier immédiatement.
              </p>
            </div>
          </div>
        `,
      })
    );

    const [emailResults, slackSent] = await Promise.all([
      Promise.allSettled(emailPromises),
      slackPromise
    ]);

    const successCount = emailResults.filter(r => r.status === 'fulfilled').length;
    const failCount = emailResults.filter(r => r.status === 'rejected').length;

    // Log this alert to alert_history
    await supabase.from('alert_history').insert({
      alert_type: 'audit_critical_action',
      severity: action === 'DELETE' ? 'high' : 'medium',
      channel: 'email',
      title: `Action critique: ${actionLabel}`,
      message: `${actionLabel} sur ${tableLabel} par ${actorEmail || 'Système'}`,
      details: { action, targetTable, targetId, actorId, metadata, emailsSent: successCount, slackSent },
    });

    logStep("Notifications sent", { emailSuccessCount: successCount, emailFailCount: failCount, slackSent });

    return new Response(JSON.stringify({ success: true, successCount, failCount, slackSent }), {
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
