import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { getServiceClient, verifyAuth } from "../_shared/auth.ts";

interface BetaEventPayload {
  event_type: string;
  context?: string;
  metadata?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Verify auth
    const { user, error: authError } = await verifyAuth(req);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: BetaEventPayload = await req.json();
    const { event_type, context, metadata = {} } = body;

    if (!event_type) {
      return new Response(JSON.stringify({ error: "event_type is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = getServiceClient();

    // Get user's organization and beta status
    const { data: userRole } = await serviceClient
      .from("user_roles")
      .select("organization_id, role")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    let companyId = userRole?.organization_id || null;
    let betaCompany = false;
    let roleScope = "saas_user";

    // Check if user has platform role
    const { data: platformRole } = await serviceClient
      .from("platform_roles")
      .select("role")
      .eq("user_id", user.id)
      .limit(1);

    if (platformRole && platformRole.length > 0) {
      roleScope = "platform_admin";
    }

    // Get beta status if we have a company
    if (companyId) {
      const { data: org } = await serviceClient
        .from("organizations")
        .select("is_beta")
        .eq("id", companyId)
        .single();

      if (org) {
        betaCompany = org.is_beta;
      }
    }

    // Determine severity based on event type
    let severity = "info";
    if (event_type.includes("error_critical")) {
      severity = "error";
    } else if (event_type.includes("error_soft") || event_type.includes("abandoned")) {
      severity = "warn";
    }

    // Build enriched metadata
    const enrichedMeta = {
      user_id: user.id,
      company_id: companyId,
      beta_company: betaCompany,
      role_scope: roleScope,
      context: context || null,
      ...metadata,
    };

    // Insert into system_events
    const { error: insertError } = await serviceClient
      .from("system_events")
      .insert({
        source: "beta_observability",
        severity,
        code: event_type,
        message: `Beta event: ${event_type}`,
        meta: enrichedMeta,
        env: "prod",
      });

    if (insertError) {
      console.error("[log-beta-event] Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to log event" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[log-beta-event] Logged: ${event_type} for user ${user.id}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[log-beta-event] Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
