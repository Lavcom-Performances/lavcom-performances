import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  hashIP, 
  formatCooldown,
  DAILY_IMPORT_BATCHES_PER_SITE,
  HOURLY_IMPORT_BATCHES_PER_SITE,
} from "../_shared/rate-limiter.ts";
import { checkFeatureOrBlock } from "../_shared/feature-flags.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// TAEX-197: Log system events for import guardrails
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

  // Send email alert for critical and error events
  if (severity === 'critical' || severity === 'error') {
    try {
      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-system-alert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
        },
        body: JSON.stringify({
          id: 0,
          created_at: new Date().toISOString(),
          env: 'prod',
          source: 'import',
          severity,
          code,
          message,
          meta: meta || {}
        })
      });
    } catch (alertError) {
      console.error('[import-csv-check] Failed to send alert:', alertError);
    }
  }
}

// TAEX-197: Check import rate limits using import_batches table
async function checkImportRateLimits(
  supabase: SupabaseClient,
  siteId: string,
  userId: string
): Promise<{ 
  allowed: boolean; 
  reason?: 'hourly_site' | 'daily_site' | 'user'; 
  cooldownSeconds?: number;
  remaining?: { hourly: number; daily: number };
}> {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Count imports in the last hour for this site
  const { count: hourlyCount, error: hourlyError } = await supabase
    .from('import_batches')
    .select('*', { count: 'exact', head: true })
    .eq('site_id', siteId)
    .gte('created_at', oneHourAgo.toISOString());

  if (hourlyError) {
    console.error('Error checking hourly rate limit:', hourlyError);
    return { allowed: true }; // Fail open
  }

  // Count imports in the last 24 hours for this site
  const { count: dailyCount, error: dailyError } = await supabase
    .from('import_batches')
    .select('*', { count: 'exact', head: true })
    .eq('site_id', siteId)
    .gte('created_at', oneDayAgo.toISOString());

  if (dailyError) {
    console.error('Error checking daily rate limit:', dailyError);
    return { allowed: true }; // Fail open
  }

  const hourlyRemaining = HOURLY_IMPORT_BATCHES_PER_SITE - (hourlyCount || 0);
  const dailyRemaining = DAILY_IMPORT_BATCHES_PER_SITE - (dailyCount || 0);

  // Check hourly limit (stricter)
  if ((hourlyCount || 0) >= HOURLY_IMPORT_BATCHES_PER_SITE) {
    // Find the oldest import in the last hour to calculate cooldown
    const { data: oldestHourly } = await supabase
      .from('import_batches')
      .select('created_at')
      .eq('site_id', siteId)
      .gte('created_at', oneHourAgo.toISOString())
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    const cooldownSeconds = oldestHourly 
      ? Math.ceil((new Date(oldestHourly.created_at).getTime() + 3600000 - now.getTime()) / 1000)
      : 3600;

    return { 
      allowed: false, 
      reason: 'hourly_site', 
      cooldownSeconds: Math.max(0, cooldownSeconds),
      remaining: { hourly: 0, daily: dailyRemaining }
    };
  }

  // Check daily limit
  if ((dailyCount || 0) >= DAILY_IMPORT_BATCHES_PER_SITE) {
    const { data: oldestDaily } = await supabase
      .from('import_batches')
      .select('created_at')
      .eq('site_id', siteId)
      .gte('created_at', oneDayAgo.toISOString())
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    const cooldownSeconds = oldestDaily 
      ? Math.ceil((new Date(oldestDaily.created_at).getTime() + 86400000 - now.getTime()) / 1000)
      : 86400;

    return { 
      allowed: false, 
      reason: 'daily_site', 
      cooldownSeconds: Math.max(0, cooldownSeconds),
      remaining: { hourly: hourlyRemaining, daily: 0 }
    };
  }

  return { 
    allowed: true,
    remaining: { hourly: hourlyRemaining, daily: dailyRemaining }
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // TAEX-223: Check feature flag
    const flagCheck = await checkFeatureOrBlock(supabase, 'imports_enabled', 'Imports CSV');
    if (!flagCheck.allowed) {
      return flagCheck.response;
    }

    // Get user from authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "unauthorized", message: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
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
    const { site_id, filename, validation_error } = body;

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

    // TAEX-197: Log validation errors if sent by client
    if (validation_error) {
      await logSystemEvent(
        supabase,
        'warn',
        'IMPORT_VALIDATION_FAIL',
        `Import validation failed: ${validation_error.reason}`,
        {
          user_id: user.id,
          site_id,
          site_name: site.name,
          filename: filename || 'unknown',
          reason_code: validation_error.reason,
          details: validation_error.details,
          ip_hash: ipHash
        }
      );

      return new Response(
        JSON.stringify({ logged: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // TAEX-197: Check rate limits using import_batches
    const rateLimitResult = await checkImportRateLimits(supabase, site_id, user.id);

    if (!rateLimitResult.allowed) {
      const cooldownSeconds = rateLimitResult.cooldownSeconds || 3600;
      const scope = rateLimitResult.reason === 'hourly_site' 
        ? 'import/csv-site-hourly' 
        : 'import/csv-site-daily';

      // Log rate limit block
      await logSystemEvent(
        supabase,
        'info',
        'IMPORT_RATE_LIMIT',
        `Import rate limit reached: ${rateLimitResult.reason}`,
        {
          user_id: user.id,
          site_id,
          site_name: site.name,
          filename: filename || 'unknown',
          reason: rateLimitResult.reason,
          cooldown_seconds: cooldownSeconds,
          ip_hash: ipHash
        }
      );

      console.log(`Rate limit (${rateLimitResult.reason}): user=${user.id.slice(0, 8)}, site=${site_id.slice(0, 8)}, cooldown=${cooldownSeconds}s`);
      
      return new Response(
        JSON.stringify({
          error: 'rate_limit_exceeded',
          scope,
          cooldown_seconds: cooldownSeconds,
          cooldown_formatted: formatCooldown(cooldownSeconds),
          message_key: rateLimitResult.reason === 'hourly_site' 
            ? 'csvImport.rateLimitHourly' 
            : 'csvImport.rateLimitDaily',
          retry_after: cooldownSeconds,
          remaining: rateLimitResult.remaining
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': cooldownSeconds.toString()
          }
        }
      );
    }

    // Log successful check (minimal, no sensitive data)
    console.log(`Import check OK: user=${user.id.slice(0, 8)}, site=${site_id.slice(0, 8)}, remaining_hourly=${rateLimitResult.remaining?.hourly}, remaining_daily=${rateLimitResult.remaining?.daily}`);

    // Return success with remaining quotas
    return new Response(
      JSON.stringify({
        allowed: true,
        remaining: rateLimitResult.remaining,
        limits: {
          hourly: HOURLY_IMPORT_BATCHES_PER_SITE,
          daily: DAILY_IMPORT_BATCHES_PER_SITE
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