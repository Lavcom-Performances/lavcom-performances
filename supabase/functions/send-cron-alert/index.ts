import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AlertRequest {
  job_name: string;
  consecutive_failures: number;
  last_error: string | null;
  failed_at: string;
}

// Send Slack notification
async function sendSlackNotification(
  webhookUrl: string,
  jobName: string,
  consecutiveFailures: number,
  lastError: string | null,
  failedAt: string
): Promise<boolean> {
  const severityEmoji = consecutiveFailures >= 5 ? "🔴" : consecutiveFailures >= 3 ? "🟠" : "🟡";
  const severityText = consecutiveFailures >= 5 ? "CRITIQUE" : consecutiveFailures >= 3 ? "AVERTISSEMENT" : "INFO";
  const severityColor = consecutiveFailures >= 5 ? "#dc2626" : consecutiveFailures >= 3 ? "#f97316" : "#eab308";

  const slackPayload = {
    attachments: [
      {
        color: severityColor,
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: `${severityEmoji} ${severityText} - Alerte Cron`,
              emoji: true
            }
          },
          {
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: `*Job:*\n${jobName}`
              },
              {
                type: "mrkdwn",
                text: `*Échecs consécutifs:*\n${consecutiveFailures}`
              },
              {
                type: "mrkdwn",
                text: `*Date:*\n${new Date(failedAt).toLocaleString('fr-FR')}`
              }
            ]
          }
        ]
      }
    ]
  };

  // Add error block if present
  if (lastError) {
    slackPayload.attachments[0].blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Dernière erreur:*\n\`\`\`${lastError.substring(0, 500)}\`\`\``
      }
    } as any);
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(slackPayload)
    });

    if (!response.ok) {
      console.error("[send-cron-alert] Slack webhook failed:", await response.text());
      return false;
    }

    console.log("[send-cron-alert] Slack notification sent successfully");
    return true;
  } catch (error) {
    console.error("[send-cron-alert] Slack error:", error);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL");
    const toEmail = Deno.env.get("RESEND_TO_EMAIL");
    const slackWebhookUrl = Deno.env.get("SLACK_WEBHOOK_URL");

    const { job_name, consecutive_failures, last_error, failed_at }: AlertRequest = await req.json();

    console.log(`[send-cron-alert] Sending alert for ${job_name} with ${consecutive_failures} consecutive failures`);

    const results = {
      email_sent: false,
      slack_sent: false,
      email_id: null as string | null,
      errors: [] as string[]
    };

    // Send Slack notification (if configured)
    if (slackWebhookUrl) {
      results.slack_sent = await sendSlackNotification(
        slackWebhookUrl,
        job_name,
        consecutive_failures,
        last_error,
        failed_at
      );
      if (!results.slack_sent) {
        results.errors.push("Slack notification failed");
      }
    } else {
      console.log("[send-cron-alert] Slack webhook not configured, skipping");
    }

    // Send email notification (if configured)
    if (resendApiKey && fromEmail && toEmail) {
      const resend = new Resend(resendApiKey);

      const severityLevel = consecutive_failures >= 5 ? "🔴 CRITIQUE" : consecutive_failures >= 3 ? "🟠 AVERTISSEMENT" : "🟡 INFO";
      const severityColor = consecutive_failures >= 5 ? "#dc2626" : consecutive_failures >= 3 ? "#f97316" : "#eab308";

      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: [toEmail],
        subject: `${severityLevel} - Échecs répétés du cron ${job_name}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: ${severityColor}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
              .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
              .stat { display: inline-block; background: white; padding: 10px 15px; border-radius: 6px; margin: 5px; border: 1px solid #e5e7eb; }
              .stat-value { font-size: 24px; font-weight: bold; color: ${severityColor}; }
              .stat-label { font-size: 12px; color: #6b7280; text-transform: uppercase; }
              .error-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 15px; margin-top: 15px; }
              .error-title { font-weight: 600; color: #991b1b; margin-bottom: 5px; }
              .error-message { font-family: monospace; font-size: 13px; color: #7f1d1d; white-space: pre-wrap; word-break: break-all; }
              .footer { margin-top: 20px; padding-top: 15px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0; font-size: 20px;">${severityLevel}</h1>
                <p style="margin: 5px 0 0 0; opacity: 0.9;">Alerte de tâche planifiée</p>
              </div>
              <div class="content">
                <h2 style="margin-top: 0;">Job: ${job_name}</h2>
                
                <div style="margin: 20px 0;">
                  <div class="stat">
                    <div class="stat-value">${consecutive_failures}</div>
                    <div class="stat-label">Échecs consécutifs</div>
                  </div>
                  <div class="stat">
                    <div class="stat-value">${new Date(failed_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
                    <div class="stat-label">Dernier échec</div>
                  </div>
                </div>

                ${last_error ? `
                <div class="error-box">
                  <div class="error-title">Dernière erreur</div>
                  <div class="error-message">${last_error}</div>
                </div>
                ` : ''}

                <div class="footer">
                  <p><strong>Date:</strong> ${new Date(failed_at).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  <p>Cet email a été envoyé automatiquement par le système de monitoring Lavcom.</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
      });

      if (error) {
        console.error("[send-cron-alert] Resend error:", error);
        results.errors.push(`Email error: ${error.message}`);
      } else {
        results.email_sent = true;
        results.email_id = data?.id || null;
        console.log("[send-cron-alert] Email sent successfully:", data);
      }
    } else {
      console.log("[send-cron-alert] Email not configured, skipping");
    }

    // Check if at least one notification was sent
    if (!results.email_sent && !results.slack_sent) {
      return new Response(
        JSON.stringify({ 
          error: "No notifications sent", 
          details: results.errors 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        email_sent: results.email_sent,
        slack_sent: results.slack_sent,
        email_id: results.email_id 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[send-cron-alert] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});