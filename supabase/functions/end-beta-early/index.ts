import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[END-BETA-EARLY] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      throw new Error("Unauthorized");
    }
    logStep("User authenticated", { userId: user.id });

    // Check if user is Platform Admin
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: adminCheck, error: adminError } = await serviceClient
      .from("platform_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "super_admin"])
      .limit(1);

    if (adminError || !adminCheck || adminCheck.length === 0) {
      logStep("Not a platform admin");
      throw new Error("Unauthorized - Platform Admin access required");
    }
    logStep("Platform Admin verified");

    // Parse request body
    const { company_id, reason } = await req.json();
    if (!company_id) {
      throw new Error("company_id is required");
    }
    logStep("Request parsed", { company_id, reason });

    // Fetch company
    const { data: company, error: companyError } = await serviceClient
      .from("organizations")
      .select("id, name, is_beta, beta_started_at, beta_ends_at")
      .eq("id", company_id)
      .single();

    if (companyError || !company) {
      throw new Error("Company not found");
    }
    logStep("Company found", { name: company.name, is_beta: company.is_beta });

    // Idempotent: if not in beta, return success
    if (!company.is_beta) {
      logStep("Not in beta, returning idempotent success");
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Company is not in beta"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // End beta early
    const { error: updateError } = await serviceClient
      .from("organizations")
      .update({
        is_beta: false,
        beta_started_at: null,
        beta_ends_at: null,
        beta_price_cents: null,
      })
      .eq("id", company_id);

    if (updateError) {
      logStep("Update failed", { error: updateError.message });
      throw new Error("Failed to end beta");
    }
    logStep("Beta ended early");

    // Log to system_events
    const { error: eventError } = await serviceClient
      .from("system_events")
      .insert({
        env: "prod",
        source: "beta_program",
        severity: "warn",
        code: "beta_ended_early",
        message: `Beta ended early for company ${company.name}`,
        meta: {
          company_id,
          company_name: company.name,
          actor_user_id: user.id,
          reason: reason || "No reason provided",
          original_beta_started_at: company.beta_started_at,
          original_beta_ends_at: company.beta_ends_at
        }
      });

    if (eventError) {
      logStep("Failed to log event", { error: eventError.message });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: error instanceof Error && error.message.includes("Unauthorized") ? 403 : 500,
    });
  }
});
