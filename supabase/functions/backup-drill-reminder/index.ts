import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const now = new Date();
    const dayOfMonth = now.getUTCDate();

    // Only run on the 1st of the month
    if (dayOfMonth !== 1) {
      console.log(`Skipping backup drill reminder - today is day ${dayOfMonth}, not 1st`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          skipped: true, 
          reason: `Not the 1st of the month (day ${dayOfMonth})` 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const monthYear = now.toLocaleDateString("fr-FR", { 
      month: "long", 
      year: "numeric" 
    });

    // Log the reminder to system_events
    const { error: logError } = await supabaseAdmin.rpc("rpc_log_system_event", {
      p_source: "backup_drill",
      p_severity: "info",
      p_code: "MONTHLY_BACKUP_DRILL_REMINDER",
      p_message: `Rappel: effectuer le drill de restauration mensuel pour ${monthYear}`,
      p_env: Deno.env.get("ENVIRONMENT") || "production",
      p_meta: {
        month: now.getUTCMonth() + 1,
        year: now.getUTCFullYear(),
        reminder_type: "backup_drill",
        action_required: "Exécuter le drill de restauration selon docs/ops/backup-restore.md",
        checklist: [
          "Vérifier l'accès aux backups",
          "Tester la procédure de restauration (staging)",
          "Valider les smoke tests",
          "Tester la réconciliation Stripe",
          "Documenter les résultats"
        ],
      },
    });

    if (logError) {
      console.error("Failed to log backup drill reminder:", logError);
      throw logError;
    }

    console.log(`Backup drill reminder logged for ${monthYear}`);

    // Optionally send an email alert to super admins
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const ADMIN_ALERT_EMAIL = Deno.env.get("ADMIN_ALERT_EMAIL");

    if (RESEND_API_KEY && ADMIN_ALERT_EMAIL) {
      try {
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "Laverie Analytics <noreply@laverie-analytics.fr>",
            to: ADMIN_ALERT_EMAIL.split(",").map((e: string) => e.trim()),
            subject: `🔄 Rappel Drill Restauration - ${monthYear}`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1a1a2e;">🔄 Rappel Mensuel: Drill de Restauration</h2>
                <p>C'est le moment d'effectuer le drill de restauration mensuel pour <strong>${monthYear}</strong>.</p>
                
                <h3 style="color: #4a4a4a;">Checklist</h3>
                <ul>
                  <li>✅ Vérifier l'accès aux backups</li>
                  <li>✅ Tester la procédure de restauration (staging)</li>
                  <li>✅ Valider les smoke tests</li>
                  <li>✅ Tester la réconciliation Stripe</li>
                  <li>✅ Documenter les résultats</li>
                </ul>
                
                <p style="margin-top: 20px;">
                  Consultez la documentation complète: 
                  <code>docs/ops/backup-restore.md</code>
                </p>
                
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
                <p style="color: #888; font-size: 12px;">
                  Ce rappel est généré automatiquement le 1er de chaque mois.
                </p>
              </div>
            `,
          }),
        });

        if (!emailResponse.ok) {
          console.warn("Email notification failed:", await emailResponse.text());
        } else {
          console.log("Email notification sent successfully");
        }
      } catch (emailError) {
        console.warn("Failed to send email notification:", emailError);
        // Don't fail the whole function if email fails
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        month: monthYear,
        logged: true,
        email_sent: !!(RESEND_API_KEY && ADMIN_ALERT_EMAIL),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Backup drill reminder error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
