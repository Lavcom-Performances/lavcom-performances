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
    const dayOfWeek = now.getUTCDay(); // 0 = Sunday, 1 = Monday
    const dayOfMonth = now.getUTCDate();

    // Only run on the first Monday of the month
    // First Monday = day 1-7 and dayOfWeek = 1
    const isFirstMonday = dayOfWeek === 1 && dayOfMonth <= 7;

    if (!isFirstMonday) {
      console.log(`Skipping DR drill reminder - today is not the first Monday (day=${dayOfMonth}, weekday=${dayOfWeek})`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          skipped: true, 
          reason: `Not the first Monday of the month (day ${dayOfMonth}, weekday ${dayOfWeek})` 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const monthYear = now.toLocaleDateString("fr-FR", { 
      month: "long", 
      year: "numeric" 
    });

    // Find the last drill evidence folder
    const { data: lastDrillFiles, error: listError } = await supabaseAdmin
      .storage
      .from("dr-evidence")
      .list("dr", {
        sortBy: { column: "name", order: "desc" },
        limit: 1,
      });

    let lastDrillDate = "Jamais";
    if (!listError && lastDrillFiles && lastDrillFiles.length > 0) {
      const lastFolder = lastDrillFiles[0];
      if (lastFolder.name && /^\d{4}-\d{2}-\d{2}$/.test(lastFolder.name)) {
        lastDrillDate = lastFolder.name;
      }
    }

    // Log the reminder to system_events
    const { error: logError } = await supabaseAdmin.rpc("rpc_log_system_event", {
      p_source: "dr_drill_reminder",
      p_severity: "info",
      p_code: "MONTHLY_DR_DRILL_REMINDER",
      p_message: `Rappel: effectuer le drill de reprise d'activité mensuel pour ${monthYear}`,
      p_env: Deno.env.get("ENVIRONMENT") || "production",
      p_meta: {
        month: now.getUTCMonth() + 1,
        year: now.getUTCFullYear(),
        reminder_type: "dr_drill",
        last_drill_date: lastDrillDate,
        action_required: "Exécuter le drill DR selon docs/ops/dr-drill.md",
        checklist: [
          "Enregistrer l'état initial (baseline)",
          "Simuler un incident (suppression/corruption)",
          "Restaurer depuis un backup",
          "Exécuter les smoke tests",
          "Vérifier le system status",
          "Collecter les preuves (screenshots + results.json)"
        ],
      },
    });

    if (logError) {
      console.error("Failed to log DR drill reminder:", logError);
      throw logError;
    }

    console.log(`DR drill reminder logged for ${monthYear}`);

    // Send email alert to super admins
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
            subject: `🔄 DR Drill Due - ${monthYear}`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1a1a2e;">🔄 Rappel: Drill de Reprise d'Activité</h2>
                <p>Le drill mensuel de reprise d'activité (DR) est dû pour <strong>${monthYear}</strong>.</p>
                
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0;"><strong>Dernier drill:</strong> ${lastDrillDate}</p>
                </div>
                
                <h3 style="color: #4a4a4a;">Checklist</h3>
                <ul>
                  <li>📸 Enregistrer l'état initial (baseline)</li>
                  <li>💥 Simuler un incident (suppression/corruption)</li>
                  <li>🔄 Restaurer depuis un backup</li>
                  <li>✅ Exécuter les smoke tests</li>
                  <li>📊 Vérifier le system status</li>
                  <li>📦 Collecter les preuves (screenshots + results.json)</li>
                </ul>
                
                <p style="margin-top: 20px;">
                  <strong>Documentation:</strong> <code>docs/ops/dr-drill.md</code><br/>
                  <strong>Evidence:</strong> <code>/admin/system-status</code> → Section DR Evidence
                </p>
                
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
                <p style="color: #888; font-size: 12px;">
                  Ce rappel est généré automatiquement le premier lundi de chaque mois à 09:00 UTC.
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
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        month: monthYear,
        last_drill_date: lastDrillDate,
        logged: true,
        email_sent: !!(RESEND_API_KEY && ADMIN_ALERT_EMAIL),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("DR drill reminder error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
