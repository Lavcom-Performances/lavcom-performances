import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get alert settings
    const { data: settings, error: settingsError } = await supabase
      .from("churn_alert_settings")
      .select("*")
      .limit(1)
      .single();

    if (settingsError && settingsError.code !== "PGRST116") {
      console.error("Error fetching settings:", settingsError);
      throw settingsError;
    }

    // If no settings exist, create default
    if (!settings) {
      const { error: insertError } = await supabase
        .from("churn_alert_settings")
        .insert({
          churn_threshold: 5,
          email_enabled: true,
          recipient_emails: [],
          alert_cooldown_hours: 24
        });
      
      if (insertError) {
        console.error("Error creating default settings:", insertError);
      }
      
      return new Response(
        JSON.stringify({ message: "No alert settings configured yet" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if email is enabled and we have recipients
    if (!settings.email_enabled || !settings.recipient_emails?.length) {
      console.log("Alerts disabled or no recipients configured");
      return new Response(
        JSON.stringify({ message: "Alerts disabled or no recipients" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check cooldown
    if (settings.last_alert_at) {
      const lastAlert = new Date(settings.last_alert_at);
      const cooldownMs = settings.alert_cooldown_hours * 60 * 60 * 1000;
      if (Date.now() - lastAlert.getTime() < cooldownMs) {
        console.log("Alert still in cooldown period");
        return new Response(
          JSON.stringify({ message: "Alert in cooldown" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Calculate current month churn
    const currentMonthStart = new Date();
    currentMonthStart.setDate(1);
    currentMonthStart.setHours(0, 0, 0, 0);

    const { count: churnCount, error: churnError } = await supabase
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("status", "canceled")
      .gte("updated_at", currentMonthStart.toISOString());

    if (churnError) {
      console.error("Error fetching churn count:", churnError);
      throw churnError;
    }

    const currentChurn = churnCount || 0;
    console.log(`Current churn: ${currentChurn}, Threshold: ${settings.churn_threshold}`);

    // Check if threshold exceeded
    if (currentChurn < settings.churn_threshold) {
      return new Response(
        JSON.stringify({ 
          message: "Churn below threshold",
          currentChurn,
          threshold: settings.churn_threshold
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send alert email
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resend = new Resend(resendApiKey);
    
    const emailContent = `
      <h1>⚠️ Alerte Churn - Seuil Dépassé</h1>
      <p>Le nombre de désabonnements ce mois-ci a atteint <strong>${currentChurn}</strong>, dépassant le seuil configuré de <strong>${settings.churn_threshold}</strong>.</p>
      <h2>Détails</h2>
      <ul>
        <li>Churn actuel: ${currentChurn}</li>
        <li>Seuil d'alerte: ${settings.churn_threshold}</li>
        <li>Date: ${new Date().toLocaleDateString('fr-FR')}</li>
      </ul>
      <p>Connectez-vous au tableau de bord admin pour plus de détails.</p>
    `;

    const { error: emailError } = await resend.emails.send({
      from: `Lavcom Analytics <${resendFromEmail}>`,
      to: settings.recipient_emails,
      subject: `⚠️ Alerte Churn: ${currentChurn} désabonnements ce mois`,
      html: emailContent,
    });

    if (emailError) {
      console.error("Error sending email:", emailError);
      throw emailError;
    }

    // Update last_alert_at
    await supabase
      .from("churn_alert_settings")
      .update({ last_alert_at: new Date().toISOString() })
      .eq("id", settings.id);

    console.log("Churn alert email sent successfully");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Alert sent",
        currentChurn,
        recipients: settings.recipient_emails.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in check-churn-alert:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
