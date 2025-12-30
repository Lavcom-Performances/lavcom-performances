import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL");
    const toEmail = Deno.env.get("RESEND_TO_EMAIL");

    if (!resendApiKey || !fromEmail || !toEmail) {
      console.error("[send-cron-alert] Missing email configuration");
      return new Response(
        JSON.stringify({ error: "Email configuration missing" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { job_name, consecutive_failures, last_error, failed_at }: AlertRequest = await req.json();

    console.log(`[send-cron-alert] Sending alert for ${job_name} with ${consecutive_failures} consecutive failures`);

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
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[send-cron-alert] Email sent successfully:", data);

    return new Response(
      JSON.stringify({ success: true, email_id: data?.id }),
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