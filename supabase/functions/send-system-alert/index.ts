import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SystemEvent {
  id: number;
  created_at: string;
  env: string;
  source: string;
  severity: string;
  code: string | null;
  message: string;
  meta: Record<string, unknown> | null;
}

// Get severity display info
function getSeverityInfo(severity: string) {
  switch (severity) {
    case "critical":
      return { emoji: "🔴", text: "CRITIQUE", color: "#dc2626" };
    case "error":
      return { emoji: "🟠", text: "ERREUR", color: "#ea580c" };
    case "warn":
      return { emoji: "🟡", text: "AVERTISSEMENT", color: "#f59e0b" };
    default:
      return { emoji: "🔵", text: "INFO", color: "#3b82f6" };
  }
}

// Get source display info
function getSourceLabel(source: string) {
  const labels: Record<string, string> = {
    "stripe-webhook": "Stripe Webhook",
    "import": "Import CSV",
    "cron": "Tâche planifiée",
    "auth": "Authentification",
    "api": "API",
  };
  return labels[source] || source;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL");
    const toEmail = Deno.env.get("RESEND_TO_EMAIL");

    if (!resendApiKey || !fromEmail || !toEmail) {
      console.log("[send-system-alert] Email not configured, skipping");
      return new Response(
        JSON.stringify({ error: "Email not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const event: SystemEvent = await req.json();
    const { emoji, text: severityText, color } = getSeverityInfo(event.severity);
    const sourceLabel = getSourceLabel(event.source);

    console.log(`[send-system-alert] Sending alert for ${event.source} (${event.severity}): ${event.message}`);

    const resend = new Resend(resendApiKey);

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [toEmail],
      subject: `${emoji} ${severityText} - ${sourceLabel}: ${event.code || event.message.substring(0, 50)}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: ${color}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
            .info-row { display: flex; margin-bottom: 10px; }
            .info-label { font-weight: 600; width: 120px; color: #6b7280; }
            .info-value { flex: 1; }
            .message-box { background: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 15px; margin-top: 15px; }
            .meta-box { background: #f3f4f6; border-radius: 6px; padding: 15px; margin-top: 15px; font-family: monospace; font-size: 13px; white-space: pre-wrap; word-break: break-all; }
            .footer { margin-top: 20px; padding-top: 15px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 20px;">${emoji} ${severityText}</h1>
              <p style="margin: 5px 0 0 0; opacity: 0.9;">Alerte système Lavcom</p>
            </div>
            <div class="content">
              <div class="info-row">
                <span class="info-label">Source:</span>
                <span class="info-value">${sourceLabel}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Environnement:</span>
                <span class="info-value">${event.env}</span>
              </div>
              ${event.code ? `
              <div class="info-row">
                <span class="info-label">Code:</span>
                <span class="info-value"><code>${event.code}</code></span>
              </div>
              ` : ''}
              <div class="info-row">
                <span class="info-label">Date:</span>
                <span class="info-value">${new Date(event.created_at).toLocaleString('fr-FR')}</span>
              </div>
              
              <div class="message-box">
                <strong>Message:</strong>
                <p style="margin: 10px 0 0 0;">${event.message}</p>
              </div>

              ${event.meta && Object.keys(event.meta).length > 0 ? `
              <div class="meta-box">
                <strong>Métadonnées:</strong>
                <pre style="margin: 10px 0 0 0;">${JSON.stringify(event.meta, null, 2)}</pre>
              </div>
              ` : ''}

              <div class="footer">
                <p>Cet email a été envoyé automatiquement par le système de monitoring Lavcom.</p>
                <p>Consultez le dashboard admin pour plus de détails.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error("[send-system-alert] Resend error:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[send-system-alert] Email sent successfully:", data);

    return new Response(
      JSON.stringify({ success: true, email_id: data?.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[send-system-alert] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
