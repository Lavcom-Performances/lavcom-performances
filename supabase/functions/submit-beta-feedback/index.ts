import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { getServiceClient, verifyAuth } from "../_shared/auth.ts";

interface FeedbackPayload {
  message: string;
  type: "bug" | "confusion" | "suggestion";
  urgency: "low" | "medium" | "high";
  route?: string;
  active_laundromat_id?: string | null;
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

    const body: FeedbackPayload = await req.json();
    const { message, type, urgency, route, active_laundromat_id } = body;

    if (!message || !type || !urgency) {
      return new Response(
        JSON.stringify({ error: "message, type, and urgency are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate type and urgency
    const validTypes = ["bug", "confusion", "suggestion"];
    const validUrgencies = ["low", "medium", "high"];

    if (!validTypes.includes(type)) {
      return new Response(JSON.stringify({ error: "Invalid type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!validUrgencies.includes(urgency)) {
      return new Response(JSON.stringify({ error: "Invalid urgency" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = getServiceClient();

    // Get user's organization and beta status
    const { data: userRole } = await serviceClient
      .from("user_roles")
      .select("organization_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    let companyId = userRole?.organization_id || null;
    let betaCompany = false;

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

    // Build enriched metadata
    const enrichedMeta = {
      user_id: user.id,
      user_email: user.email,
      company_id: companyId,
      beta_company: betaCompany,
      feedback_type: type,
      urgency,
      route: route || null,
      active_laundromat_id: active_laundromat_id || null,
      message: message.slice(0, 2000), // Limit message length
    };

    // Insert into system_events
    const { error: insertError } = await serviceClient
      .from("system_events")
      .insert({
        source: "beta_feedback",
        severity: urgency === "high" ? "warn" : "info",
        code: "beta_feedback_submitted",
        message: `Feedback (${type}): ${message.slice(0, 100)}${message.length > 100 ? "..." : ""}`,
        meta: enrichedMeta,
        env: "prod",
      });

    if (insertError) {
      console.error("[submit-beta-feedback] Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to submit feedback" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[submit-beta-feedback] Feedback submitted by user ${user.id}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[submit-beta-feedback] Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
