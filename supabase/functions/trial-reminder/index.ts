import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting trial reminder check...");

    // Calculate the date 3 days from now (start and end of that day)
    const now = new Date();
    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    
    // Get start and end of that day in ISO format
    const startOfDay = new Date(threeDaysFromNow);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(threeDaysFromNow);
    endOfDay.setHours(23, 59, 59, 999);

    console.log(`Looking for trials ending between ${startOfDay.toISOString()} and ${endOfDay.toISOString()}`);

    // Find users with trials ending in 3 days who haven't received a reminder
    const { data: subscriptions, error: subError } = await supabase
      .from("subscriptions")
      .select("id, user_id, trial_end_date")
      .eq("plan_type", "trial")
      .eq("status", "active")
      .eq("trial_reminder_sent", false)
      .gte("trial_end_date", startOfDay.toISOString())
      .lte("trial_end_date", endOfDay.toISOString());

    if (subError) {
      console.error("Error fetching subscriptions:", subError);
      throw subError;
    }

    console.log(`Found ${subscriptions?.length || 0} subscriptions to notify`);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: "No trial reminders to send", count: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    let sentCount = 0;
    const errors: string[] = [];

    for (const subscription of subscriptions) {
      try {
        // Get user profile for email and name
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("email, first_name, company_name")
          .eq("id", subscription.user_id)
          .single();

        if (profileError || !profile?.email) {
          console.error(`Could not find profile for user ${subscription.user_id}:`, profileError);
          errors.push(`User ${subscription.user_id}: profile not found`);
          continue;
        }

        const userName = profile.first_name || profile.company_name || "Cher utilisateur";
        const trialEndDate = new Date(subscription.trial_end_date!);
        const formattedDate = trialEndDate.toLocaleDateString("fr-FR", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric"
        });

        console.log(`Sending reminder to ${profile.email}...`);

        // Send reminder email
        const { error: emailError } = await resend.emails.send({
          from: Deno.env.get("RESEND_FROM_EMAIL") || "Lavcom Performances <noreply@lavcom.fr>",
          to: [profile.email],
          subject: "Votre essai gratuit se termine dans 3 jours",
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #2563eb, #7c3aed); padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
                .header h1 { color: white; margin: 0; font-size: 24px; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
                .cta-button { display: inline-block; background: linear-gradient(135deg, #2563eb, #7c3aed); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
                .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
                .highlight { background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>⏰ Plus que 3 jours !</h1>
                </div>
                <div class="content">
                  <p>Bonjour ${userName},</p>
                  
                  <p>Votre essai gratuit de <strong>Lavcom Performances</strong> se termine le <strong>${formattedDate}</strong>.</p>
                  
                  <div class="highlight">
                    <strong>Ne perdez pas l'accès à :</strong>
                    <ul>
                      <li>📊 Vos tableaux de bord et analyses</li>
                      <li>📈 Le suivi de vos performances</li>
                      <li>💡 Les recommandations personnalisées</li>
                      <li>📋 L'historique de vos données</li>
                    </ul>
                  </div>
                  
                  <p>Pour continuer à utiliser toutes les fonctionnalités, passez à un abonnement payant dès maintenant :</p>
                  
                  <p style="text-align: center;">
                    <a href="https://lavcom.fr/subscribe" class="cta-button">
                      Choisir mon abonnement →
                    </a>
                  </p>
                  
                  <p>Des questions ? Répondez simplement à cet email, nous sommes là pour vous aider.</p>
                  
                  <p>À bientôt,<br>L'équipe Lavcom Performances</p>
                </div>
                <div class="footer">
                  <p>© ${new Date().getFullYear()} Lavcom Performances - Tous droits réservés</p>
                </div>
              </div>
            </body>
            </html>
          `,
        });

        if (emailError) {
          console.error(`Error sending email to ${profile.email}:`, emailError);
          errors.push(`User ${subscription.user_id}: email send failed`);
          continue;
        }

        // Mark reminder as sent
        const { error: updateError } = await supabase
          .from("subscriptions")
          .update({ trial_reminder_sent: true })
          .eq("id", subscription.id);

        if (updateError) {
          console.error(`Error updating subscription ${subscription.id}:`, updateError);
          errors.push(`User ${subscription.user_id}: update failed`);
          continue;
        }

        console.log(`Successfully sent reminder to ${profile.email}`);
        sentCount++;
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`Error processing subscription ${subscription.id}:`, err);
        errors.push(`Subscription ${subscription.id}: ${errorMessage}`);
      }
    }

    console.log(`Trial reminder job completed. Sent: ${sentCount}, Errors: ${errors.length}`);

    return new Response(
      JSON.stringify({
        message: "Trial reminder job completed",
        sent: sentCount,
        total: subscriptions.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in trial-reminder function:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
