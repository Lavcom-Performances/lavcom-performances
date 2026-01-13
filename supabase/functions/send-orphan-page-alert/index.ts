import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const slackWebhookUrl = Deno.env.get("SLACK_WEBHOOK_URL");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrphanPageAlertRequest {
  route_path: string;
  page_name: string;
  notes?: string;
  flagged_by_email?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Verify the user is a platform admin
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check if user is platform admin using service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: platformRole } = await supabaseAdmin
      .from("platform_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!platformRole || !["super_admin", "admin"].includes(platformRole.role)) {
      return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { route_path, page_name, notes, flagged_by_email }: OrphanPageAlertRequest = await req.json();

    if (!route_path || !page_name) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";
    const toEmail = Deno.env.get("RESEND_TO_EMAIL") || "dev@example.com";

    const emailResponse = await resend.emails.send({
      from: `Lavcom Alerts <${fromEmail}>`,
      to: [toEmail],
      subject: `🚩 Orphan Page Flagged: ${page_name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #dc2626; border-bottom: 2px solid #dc2626; padding-bottom: 10px;">
            🚩 Orphan Page Flagged for Cleanup
          </h1>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 10px; background: #f3f4f6; font-weight: bold; width: 30%;">Page Name</td>
              <td style="padding: 10px; background: #f9fafb;">${page_name}</td>
            </tr>
            <tr>
              <td style="padding: 10px; background: #f3f4f6; font-weight: bold;">Route Path</td>
              <td style="padding: 10px; background: #f9fafb;"><code style="background: #e5e7eb; padding: 2px 6px; border-radius: 4px;">${route_path}</code></td>
            </tr>
            ${flagged_by_email ? `
            <tr>
              <td style="padding: 10px; background: #f3f4f6; font-weight: bold;">Flagged By</td>
              <td style="padding: 10px; background: #f9fafb;">${flagged_by_email}</td>
            </tr>
            ` : ''}
            ${notes ? `
            <tr>
              <td style="padding: 10px; background: #f3f4f6; font-weight: bold;">Notes</td>
              <td style="padding: 10px; background: #f9fafb;">${notes}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 10px; background: #f3f4f6; font-weight: bold;">Flagged At</td>
              <td style="padding: 10px; background: #f9fafb;">${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}</td>
            </tr>
          </table>

          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #991b1b;">
              <strong>Action Required:</strong> This page has been flagged for cleanup by a platform administrator. 
              Please review and either remove or update this orphan page.
            </p>
          </div>

          <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
            This is an automated notification from the Lavcom Platform Admin Panel.
          </p>
        </div>
      `,
    });

    console.log("[send-orphan-page-alert] Email sent:", emailResponse);

    // Send Slack notification if webhook is configured
    let slackResponse = null;
    if (slackWebhookUrl) {
      try {
        const slackPayload = {
          blocks: [
            {
              type: "header",
              text: {
                type: "plain_text",
                text: "🚩 Orphan Page Flagged for Cleanup",
                emoji: true,
              },
            },
            {
              type: "section",
              fields: [
                {
                  type: "mrkdwn",
                  text: `*Page Name:*\n${page_name}`,
                },
                {
                  type: "mrkdwn",
                  text: `*Route Path:*\n\`${route_path}\``,
                },
              ],
            },
            ...(flagged_by_email
              ? [
                  {
                    type: "section",
                    fields: [
                      {
                        type: "mrkdwn",
                        text: `*Flagged By:*\n${flagged_by_email}`,
                      },
                      {
                        type: "mrkdwn",
                        text: `*Flagged At:*\n${new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}`,
                      },
                    ],
                  },
                ]
              : []),
            ...(notes
              ? [
                  {
                    type: "section",
                    text: {
                      type: "mrkdwn",
                      text: `*Notes:*\n${notes}`,
                    },
                  },
                ]
              : []),
            {
              type: "context",
              elements: [
                {
                  type: "mrkdwn",
                  text: "⚠️ This page has been flagged for cleanup by a platform administrator.",
                },
              ],
            },
          ],
        };

        const slackRes = await fetch(slackWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(slackPayload),
        });

        slackResponse = { ok: slackRes.ok, status: slackRes.status };
        console.log("[send-orphan-page-alert] Slack sent:", slackResponse);
      } catch (slackError: any) {
        console.error("[send-orphan-page-alert] Slack error:", slackError);
        slackResponse = { error: slackError?.message || "Unknown error" };
      }
    }

    // Log to alert_history
    await supabaseAdmin.from("alert_history").insert({
      alert_type: "orphan_page_flagged",
      severity: "warning",
      title: `Orphan Page Flagged: ${page_name}`,
      message: `Route ${route_path} was flagged for cleanup${notes ? `: ${notes}` : ''}`,
      recipient: toEmail,
      channel: slackWebhookUrl ? "email+slack" : "email",
      details: { route_path, page_name, notes, flagged_by: user.id, slack_sent: !!slackResponse?.ok },
    });

    return new Response(JSON.stringify({ success: true, emailResponse, slackResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("[send-orphan-page-alert] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
