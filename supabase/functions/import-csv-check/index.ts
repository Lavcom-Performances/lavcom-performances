import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  checkRateLimit, 
  hashIP, 
  rateLimitResponse,
  type RateLimitScope 
} from "../_shared/rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper to log system events
async function logSystemEvent(
  supabase: SupabaseClient,
  severity: 'info' | 'warn' | 'error' | 'critical',
  code: string,
  message: string,
  meta?: Record<string, unknown>
) {
  try {
    await supabase.rpc('rpc_log_system_event', {
      p_env: 'prod',
      p_source: 'import',
      p_severity: severity,
      p_code: code,
      p_message: message,
      p_meta: meta || {}
    });
  } catch (err) {
    console.error('[import-csv-check] Failed to log system event:', err);
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Get user from authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "unauthorized", message: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify the JWT token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.log("Auth error:", userError?.message);
      return new Response(
        JSON.stringify({ error: "unauthorized", message: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body = await req.json();
    const { site_id, filename } = body;

    if (!site_id) {
      return new Response(
        JSON.stringify({ error: "bad_request", message: "site_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user owns the site (security check)
    const { data: site, error: siteError } = await supabase
      .from("sites")
      .select("id, user_id, name")
      .eq("id", site_id)
      .eq("user_id", user.id)
      .single();

    if (siteError || !site) {
      console.log(`Site ownership check failed: user=${user.id.slice(0, 8)}, site=${site_id.slice(0, 8)}`);
      return new Response(
        JSON.stringify({ error: "forbidden", message: "Site not found or access denied" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get IP hash for logging (privacy-safe)
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("cf-connecting-ip") || 
                     "unknown";
    const ipHash = await hashIP(clientIP);

    // Check rate limit: 1 import per 2 min per site
    const siteRateLimit = await checkRateLimit(
      supabaseUrl,
      supabaseServiceKey,
      "import/csv-site" as RateLimitScope,
      site_id,
      ipHash
    );

    if (!siteRateLimit.allowed) {
      console.log(`Rate limit (site): user=${user.id.slice(0, 8)}, site=${site_id.slice(0, 8)}, cooldown=${siteRateLimit.cooldownSeconds}s`);
      return rateLimitResponse(siteRateLimit.cooldownSeconds || 120, "import/csv-site", corsHeaders);
    }

    // Check rate limit: 10 imports per hour per user
    const userRateLimit = await checkRateLimit(
      supabaseUrl,
      supabaseServiceKey,
      "import/csv-user" as RateLimitScope,
      user.id,
      ipHash
    );

    if (!userRateLimit.allowed) {
      console.log(`Rate limit (user): user=${user.id.slice(0, 8)}, cooldown=${userRateLimit.cooldownSeconds}s`);
      return rateLimitResponse(userRateLimit.cooldownSeconds || 3600, "import/csv-user", corsHeaders);
    }

    // Log successful check (minimal, no sensitive data)
    console.log(`Import check OK: user=${user.id.slice(0, 8)}, site=${site_id.slice(0, 8)}, remaining_site=${siteRateLimit.remaining}, remaining_user=${userRateLimit.remaining}`);

    // Return success with remaining quotas
    return new Response(
      JSON.stringify({
        allowed: true,
        remaining: {
          site: siteRateLimit.remaining,
          user: userRateLimit.remaining
        },
        reset_in: {
          site: siteRateLimit.resetIn,
          user: userRateLimit.resetIn
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Import check error:", error);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    await logSystemEvent(supabase, 'error', 'IMPORT_CHECK_FAIL', 'Import CSV check failed', { error: error instanceof Error ? error.message : String(error) });
    return new Response(
      JSON.stringify({ error: "internal_error", message: "An error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
