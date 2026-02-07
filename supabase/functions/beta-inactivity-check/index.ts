import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { getServiceClient } from "../_shared/auth.ts";

const INACTIVITY_THRESHOLD_DAYS = 5;

interface InactiveCompany {
  company_id: string;
  company_name: string;
  owner_email: string;
  days_inactive: number;
  last_activity_at: string | null;
  beta_started_at: string | null;
}

Deno.serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // This is a cron job - verify it's authorized
  const authHeader = req.headers.get("Authorization");
  const cronSecret = Deno.env.get("CRON_SECRET");
  
  // Allow service role or cron secret
  if (authHeader !== `Bearer ${cronSecret}` && !authHeader?.includes("service_role")) {
    // Check if it's a platform admin calling manually
    const serviceClient = getServiceClient();
    const token = authHeader?.replace("Bearer ", "");
    
    if (token) {
      const { data: { user } } = await serviceClient.auth.getUser(token);
      if (user) {
        const { data: platformRole } = await serviceClient
          .from("platform_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();
        
        if (!platformRole || !["super_admin", "admin"].includes(platformRole.role)) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    } else {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  try {
    const serviceClient = getServiceClient();
    const now = new Date();
    const thresholdDate = new Date(now.getTime() - INACTIVITY_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);

    console.log(`[beta-inactivity-check] Running check for ${INACTIVITY_THRESHOLD_DAYS} days inactivity`);

    // Get all beta companies
    const { data: betaOrgs, error: orgsError } = await serviceClient
      .from("organizations")
      .select("id, name, owner_id, beta_started_at")
      .eq("is_beta", true)
      .is("deleted_at", null);

    if (orgsError) {
      console.error("[beta-inactivity-check] Error fetching orgs:", orgsError);
      throw orgsError;
    }

    if (!betaOrgs || betaOrgs.length === 0) {
      console.log("[beta-inactivity-check] No beta companies found");
      return new Response(JSON.stringify({ message: "No beta companies", checked: 0, alerts: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get recent events for all beta companies
    const { data: recentEvents, error: eventsError } = await serviceClient
      .from("system_events")
      .select("meta, created_at")
      .eq("source", "beta_observability")
      .gte("created_at", thresholdDate.toISOString());

    if (eventsError) {
      console.error("[beta-inactivity-check] Error fetching events:", eventsError);
    }

    // Get owner emails
    const ownerIds = [...new Set(betaOrgs.map(o => o.owner_id))];
    const { data: profiles } = await serviceClient
      .from("profiles")
      .select("id, email")
      .in("id", ownerIds);

    const emailMap = new Map((profiles || []).map(p => [p.id, p.email]));

    // Find inactive companies
    const inactiveCompanies: InactiveCompany[] = [];
    const activeCompanyIds = new Set(
      (recentEvents || []).map(e => (e.meta as any)?.company_id).filter(Boolean)
    );

    for (const org of betaOrgs) {
      if (!activeCompanyIds.has(org.id)) {
        // Check if they had any activity before the threshold
        const { data: lastEvent } = await serviceClient
          .from("system_events")
          .select("created_at")
          .eq("source", "beta_observability")
          .contains("meta", { company_id: org.id })
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        const lastActivityAt = lastEvent?.created_at || null;
        const daysInactive = lastActivityAt
          ? Math.floor((now.getTime() - new Date(lastActivityAt).getTime()) / (1000 * 60 * 60 * 24))
          : Math.floor((now.getTime() - new Date(org.beta_started_at || now).getTime()) / (1000 * 60 * 60 * 24));

        if (daysInactive >= INACTIVITY_THRESHOLD_DAYS) {
          inactiveCompanies.push({
            company_id: org.id,
            company_name: org.name,
            owner_email: emailMap.get(org.owner_id) || "unknown",
            days_inactive: daysInactive,
            last_activity_at: lastActivityAt,
            beta_started_at: org.beta_started_at,
          });
        }
      }
    }

    console.log(`[beta-inactivity-check] Found ${inactiveCompanies.length} inactive companies`);

    // Log alerts to system_events
    for (const company of inactiveCompanies) {
      // Check if we already sent an alert for this company recently (within 24h)
      const { data: recentAlert } = await serviceClient
        .from("system_events")
        .select("id")
        .eq("code", "beta_inactivity_alert")
        .contains("meta", { company_id: company.company_id })
        .gte("created_at", new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
        .limit(1);

      if (recentAlert && recentAlert.length > 0) {
        console.log(`[beta-inactivity-check] Skipping ${company.company_name} - alert sent recently`);
        continue;
      }

      // Log the alert
      await serviceClient.from("system_events").insert({
        source: "beta_inactivity_cron",
        severity: "warn",
        code: "beta_inactivity_alert",
        message: `Beta company ${company.company_name} inactive for ${company.days_inactive} days`,
        meta: {
          company_id: company.company_id,
          company_name: company.company_name,
          owner_email: company.owner_email,
          days_inactive: company.days_inactive,
          last_activity_at: company.last_activity_at,
          threshold_days: INACTIVITY_THRESHOLD_DAYS,
        },
        env: "prod",
      });

      console.log(`[beta-inactivity-check] Alert logged for ${company.company_name}`);
    }

    // Send summary to Slack if configured
    const slackWebhook = Deno.env.get("SLACK_WEBHOOK_URL");
    if (slackWebhook && inactiveCompanies.length > 0) {
      try {
        const slackMessage = {
          blocks: [
            {
              type: "header",
              text: {
                type: "plain_text",
                text: `⚠️ Beta Inactivity Alert`,
                emoji: true,
              },
            },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*${inactiveCompanies.length} beta companies* inactive for ${INACTIVITY_THRESHOLD_DAYS}+ days:`,
              },
            },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: inactiveCompanies
                  .slice(0, 10)
                  .map(c => `• *${c.company_name}*: ${c.days_inactive}j inactif`)
                  .join("\n"),
              },
            },
          ],
        };

        await fetch(slackWebhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(slackMessage),
        });
        console.log("[beta-inactivity-check] Slack notification sent");
      } catch (slackError) {
        console.warn("[beta-inactivity-check] Failed to send Slack notification:", slackError);
      }
    }

    return new Response(
      JSON.stringify({
        message: "Inactivity check complete",
        checked: betaOrgs.length,
        inactive: inactiveCompanies.length,
        threshold_days: INACTIVITY_THRESHOLD_DAYS,
        inactive_companies: inactiveCompanies.map(c => ({
          name: c.company_name,
          days: c.days_inactive,
        })),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[beta-inactivity-check] Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
