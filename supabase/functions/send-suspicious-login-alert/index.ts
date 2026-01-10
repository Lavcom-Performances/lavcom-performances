import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SuspiciousLoginAlertRequest {
  user_id: string;
  email: string;
  browser: string;
  os: string;
  device_type: string;
  country: string;
  city: string;
  ip_address: string;
  suspicious_reason: string;
  login_time: string;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "Lavcom Admin <noreply@lavcom.fr>";
    const adminAlertEmail = Deno.env.get("RESEND_TO_EMAIL") || "admin@lavcom.fr";

    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const data: SuspiciousLoginAlertRequest = await req.json();
    const {
      user_id,
      email,
      browser,
      os,
      device_type,
      country,
      city,
      ip_address,
      suspicious_reason,
      login_time,
    } = data;

    // Get user info from platform_roles
    const { data: roleData } = await supabase
      .from("platform_roles")
      .select("role")
      .eq("user_id", user_id)
      .single();

    const roleName = roleData?.role || "unknown";

    // Format login time
    const formattedTime = new Date(login_time).toLocaleString("fr-FR", {
      dateStyle: "full",
      timeStyle: "medium",
      timeZone: "Europe/Paris",
    });

    // Send email using Resend REST API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: resendFromEmail,
        to: [adminAlertEmail],
        subject: "🚨 Connexion suspecte détectée - Back-office Admin",
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
                .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 30px; text-align: center; }
                .header h1 { margin: 0; font-size: 24px; }
                .content { padding: 30px; }
                .alert-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 15px; margin-bottom: 20px; }
                .alert-box h3 { color: #dc2626; margin: 0 0 10px 0; }
                .info-grid { display: grid; gap: 15px; }
                .info-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
                .info-label { color: #6b7280; font-weight: 500; }
                .info-value { color: #111827; font-weight: 600; }
                .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
                .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; }
                .badge-danger { background: #fecaca; color: #dc2626; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🚨 Connexion Suspecte Détectée</h1>
                </div>
                <div class="content">
                  <div class="alert-box">
                    <h3>⚠️ Raison de l'alerte</h3>
                    <p style="margin: 0; color: #dc2626; font-weight: 500;">${suspicious_reason}</p>
                  </div>

                  <h2 style="color: #111827; margin-bottom: 20px;">Détails de la connexion</h2>
                  
                  <div class="info-grid">
                    <div class="info-item">
                      <span class="info-label">Utilisateur</span>
                      <span class="info-value">${email}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">Rôle</span>
                      <span class="info-value"><span class="badge badge-danger">${roleName}</span></span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">Date & Heure</span>
                      <span class="info-value">${formattedTime}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">Localisation</span>
                      <span class="info-value">${city || "Inconnue"}, ${country || "Inconnu"}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">Adresse IP</span>
                      <span class="info-value">${ip_address || "Non disponible"}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">Navigateur</span>
                      <span class="info-value">${browser || "Inconnu"}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">Système</span>
                      <span class="info-value">${os || "Inconnu"}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">Type d'appareil</span>
                      <span class="info-value">${device_type || "Inconnu"}</span>
                    </div>
                  </div>

                  <div style="margin-top: 30px; padding: 15px; background: #fef3c7; border-radius: 8px; border: 1px solid #fcd34d;">
                    <p style="margin: 0; color: #92400e; font-size: 14px;">
                      <strong>Action recommandée :</strong> Vérifiez si cette connexion est légitime. 
                      Si ce n'est pas le cas, révoquez immédiatement l'accès de cet utilisateur depuis le back-office.
                    </p>
                  </div>
                </div>
                <div class="footer">
                  <p>Cet email a été envoyé automatiquement par le système de sécurité Lavcom.</p>
                  <p>© ${new Date().getFullYear()} Lavcom Performances - Back-office Administration</p>
                </div>
              </div>
            </body>
          </html>
        `,
      }),
    });

    const emailResult = await emailResponse.json();
    console.log("Suspicious login alert sent:", emailResult);

    // Log the alert in alert_history
    await supabase.from("alert_history").insert({
      alert_type: "suspicious_admin_login",
      severity: "critical",
      channel: "email",
      title: "Connexion suspecte - Back-office Admin",
      message: `Connexion suspecte détectée pour ${email}: ${suspicious_reason}`,
      recipient: adminAlertEmail,
      details: {
        user_id,
        email,
        browser,
        os,
        device_type,
        country,
        city,
        ip_address,
        suspicious_reason,
        login_time,
      },
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error sending suspicious login alert:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
