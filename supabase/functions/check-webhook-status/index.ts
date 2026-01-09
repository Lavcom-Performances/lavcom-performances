import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CHECK-WEBHOOK-STATUS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const alertEmail = Deno.env.get("RESEND_TO_EMAIL");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "alerts@resend.dev";

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase credentials");
    }

    if (!resendApiKey || !alertEmail) {
      throw new Error("Missing Resend credentials or alert email");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);

    // Get configurable threshold from cron_alert_settings (default: 24h)
    const { data: alertSettings } = await supabase
      .from("cron_alert_settings")
      .select("webhook_alert_threshold_hours")
      .eq("job_name", "check-webhook-status")
      .maybeSingle();

    const thresholdHours = alertSettings?.webhook_alert_threshold_hours ?? 24;
    const ALERT_THRESHOLD_MS = thresholdHours * 60 * 60 * 1000;

    logStep("Alert threshold configured", { thresholdHours });

    // Get total event count to check if webhook was ever active
    const { count: totalEvents, error: countError } = await supabase
      .from("stripe_events")
      .select("*", { count: "exact", head: true });

    if (countError) {
      throw countError;
    }

    logStep("Total events count", { totalEvents });

    // If no events ever received, skip alerting (webhook never set up or no payments yet)
    if (!totalEvents || totalEvents === 0) {
      logStep("No events ever received - webhook not yet active, skipping alert");
      return new Response(
        JSON.stringify({ 
          status: "not_active_yet", 
          reason: "No Stripe events have ever been received. Webhook monitoring will start after first event." 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the last Stripe event
    const { data: lastEvent, error: eventError } = await supabase
      .from("stripe_events")
      .select("event_type, created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (eventError) {
      throw eventError;
    }

    logStep("Last event fetched", lastEvent);

    // Check if we need to alert - only if webhook was active before
    const now = new Date().getTime();
    
    let shouldAlert = false;
    let alertReason = "";
    let minutesSinceLastEvent = 0;

    if (lastEvent) {
      const lastEventTime = new Date(lastEvent.created_at).getTime();
      const timeSinceLastEvent = now - lastEventTime;
      minutesSinceLastEvent = Math.round(timeSinceLastEvent / 60000);
      const hoursSinceLastEvent = Math.round(timeSinceLastEvent / 3600000);

      if (timeSinceLastEvent > ALERT_THRESHOLD_MS) {
        shouldAlert = true;
        alertReason = `Le dernier événement Stripe (${lastEvent.event_type}) a été reçu il y a ${hoursSinceLastEvent} heures (${minutesSinceLastEvent} minutes).`;
        logStep("Event too old, should alert", { hoursSinceLastEvent, minutesSinceLastEvent });
      } else {
        logStep("Webhook healthy", { minutesSinceLastEvent });
      }
    }

    // Check cooldown - don't send alerts more than once per hour
    if (shouldAlert) {
      const { data: recentAlert } = await supabase
        .from("cron_logs")
        .select("id")
        .eq("job_name", "webhook-alert-sent")
        .gte("started_at", new Date(now - 60 * 60 * 1000).toISOString())
        .limit(1);

      if (recentAlert && recentAlert.length > 0) {
        logStep("Alert already sent within the last hour, skipping");
        return new Response(
          JSON.stringify({ status: "skipped", reason: "Alert cooldown active" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Send alert email
      logStep("Sending alert email", { to: alertEmail });

      const emailResponse = await resend.emails.send({
        from: `Lavcom Alerts <${fromEmail}>`,
        to: [alertEmail],
        subject: "⚠️ Alerte: Webhook Stripe inactif",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #dc2626;">⚠️ Alerte Webhook Stripe</h1>
            <p style="font-size: 16px; color: #374151;">
              ${alertReason}
            </p>
            <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 24px 0;">
              <p style="margin: 0; color: #991b1b;">
                <strong>Action requise:</strong> Vérifiez que le webhook Stripe est correctement configuré et que l'endpoint est accessible.
              </p>
            </div>
            <h3 style="color: #374151;">Vérifications suggérées:</h3>
            <ul style="color: #6b7280;">
              <li>Vérifiez le dashboard Stripe → Webhooks</li>
              <li>Vérifiez les logs de l'edge function stripe-webhook</li>
              <li>Testez un paiement en mode TEST</li>
            </ul>
            <p style="font-size: 14px; color: #9ca3af; margin-top: 32px;">
              Cet email a été envoyé automatiquement par le système de monitoring Lavcom.
            </p>
          </div>
        `,
      });

      logStep("Email sent", emailResponse);

      // Log that we sent an alert
      await supabase.from("cron_logs").insert({
        job_name: "webhook-alert-sent",
        status: "completed",
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        details: { alert_reason: alertReason, minutes_since_last_event: minutesSinceLastEvent },
      });

      return new Response(
        JSON.stringify({ status: "alert_sent", reason: alertReason }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        status: "healthy", 
        minutes_since_last_event: minutesSinceLastEvent,
        last_event_type: lastEvent?.event_type 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
