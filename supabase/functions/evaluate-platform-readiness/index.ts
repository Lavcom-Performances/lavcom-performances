import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Blocker secrets that MUST be present
const BLOCKER_SECRETS = [
  'CRON_SECRET',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'RESEND_API_KEY',
];

// Required feature flags
const REQUIRED_FEATURE_FLAGS = [
  'imports_enabled',
  'stripe_checkout_enabled',
];

// Cache for readiness result (5 minutes TTL)
let cachedResult: { data: ReadinessResult; timestamp: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface ReadinessCheck {
  id: string;
  name: string;
  category: 'secrets' | 'stripe' | 'security' | 'data' | 'ops';
  status: 'PASS' | 'FAIL' | 'WARN';
  reason?: string;
  link?: string;
}

interface ReadinessResult {
  status: 'READY' | 'NOT_READY';
  evaluatedAt: string;
  checks: ReadinessCheck[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth: platform admin only
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const userId = claimsData.claims.sub as string;

    // Check if user is platform admin or super_admin
    const { data: platformRole } = await supabase
      .from('platform_roles')
      .select('role')
      .eq('user_id', userId)
      .in('role', ['super_admin', 'admin'])
      .maybeSingle();

    if (!platformRole) {
      return new Response(JSON.stringify({ error: 'Forbidden: platform admin only' }), { 
        status: 403, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Check for force refresh
    const url = new URL(req.url);
    const forceRefresh = url.searchParams.get('force') === 'true';

    // Return cached result if valid
    if (!forceRefresh && cachedResult && (Date.now() - cachedResult.timestamp) < CACHE_TTL_MS) {
      return new Response(JSON.stringify({
        ...cachedResult.data,
        cached: true,
        cacheExpiresAt: new Date(cachedResult.timestamp + CACHE_TTL_MS).toISOString(),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const checks: ReadinessCheck[] = [];
    const now = new Date();

    // ========================================
    // 1. SECRETS CHECK
    // ========================================
    for (const secretName of BLOCKER_SECRETS) {
      const value = Deno.env.get(secretName);
      const isPresent = value !== undefined && value !== null && value.trim().length > 0;
      
      checks.push({
        id: `secret_${secretName.toLowerCase()}`,
        name: `Secret: ${secretName}`,
        category: 'secrets',
        status: isPresent ? 'PASS' : 'FAIL',
        reason: isPresent ? undefined : `Missing blocker secret: ${secretName}`,
        link: '/admin/system-status#secrets',
      });
    }

    // ========================================
    // 2. STRIPE CHECKS
    // ========================================
    // Check if Stripe is in LIVE mode (key starts with sk_live)
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') || '';
    const isLiveMode = stripeKey.startsWith('sk_live_');
    checks.push({
      id: 'stripe_mode',
      name: 'Stripe Mode: LIVE',
      category: 'stripe',
      status: isLiveMode ? 'PASS' : 'WARN',
      reason: isLiveMode ? undefined : 'Stripe is in test mode (sk_test_)',
    });

    // Check webhook health (last stripe event < 24h ago if there are any events)
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const { data: lastStripeEvent } = await supabase
      .from('stripe_events')
      .select('created_at, event_type')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { count: totalStripeEvents } = await supabase
      .from('stripe_events')
      .select('*', { count: 'exact', head: true });

    let webhookStatus: 'PASS' | 'FAIL' | 'WARN' = 'PASS';
    let webhookReason: string | undefined;

    if (!totalStripeEvents || totalStripeEvents === 0) {
      // No events yet - not necessarily a failure
      webhookStatus = 'WARN';
      webhookReason = 'No Stripe events received yet';
    } else if (lastStripeEvent) {
      const lastEventTime = new Date(lastStripeEvent.created_at);
      if (lastEventTime < twentyFourHoursAgo) {
        webhookStatus = 'WARN';
        webhookReason = `Last webhook event was ${Math.floor((now.getTime() - lastEventTime.getTime()) / (60 * 60 * 1000))}h ago`;
      }
    }

    checks.push({
      id: 'stripe_webhook',
      name: 'Stripe Webhook Health',
      category: 'stripe',
      status: webhookStatus,
      reason: webhookReason,
      link: '/admin/system-status#stripe',
    });

    // ========================================
    // 3. SECURITY CHECKS (Feature Flags)
    // ========================================
    for (const flagKey of REQUIRED_FEATURE_FLAGS) {
      const { data: flag } = await supabase
        .from('platform_feature_flags')
        .select('is_enabled')
        .eq('key', flagKey)
        .maybeSingle();

      const isEnabled = flag?.is_enabled ?? true; // Fail open if not found
      
      checks.push({
        id: `flag_${flagKey}`,
        name: `Feature Flag: ${flagKey}`,
        category: 'security',
        status: isEnabled ? 'PASS' : 'FAIL',
        reason: isEnabled ? undefined : `Feature flag ${flagKey} is disabled`,
        link: '/admin/system-status#feature-flags',
      });
    }

    // Check for critical system_events in last 24h
    const { count: criticalEventsCount } = await supabase
      .from('system_events')
      .select('*', { count: 'exact', head: true })
      .eq('severity', 'critical')
      .gte('created_at', twentyFourHoursAgo.toISOString());

    checks.push({
      id: 'no_critical_events',
      name: 'No Critical Events (24h)',
      category: 'security',
      status: (criticalEventsCount || 0) === 0 ? 'PASS' : 'FAIL',
      reason: (criticalEventsCount || 0) > 0 
        ? `${criticalEventsCount} critical event(s) in last 24h` 
        : undefined,
      link: '/admin/system-status',
    });

    // ========================================
    // 4. DATA CHECKS (Smoke Tests + Import Parser Tests)
    // ========================================
    // Check last smoke test result from system_events
    const { data: lastSmokeTest } = await supabase
      .from('system_events')
      .select('severity, message, created_at')
      .eq('source', 'smoke-test')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let smokeTestStatus: 'PASS' | 'FAIL' | 'WARN' = 'WARN';
    let smokeTestReason: string | undefined = 'No smoke tests found';

    if (lastSmokeTest) {
      const isRecent = new Date(lastSmokeTest.created_at) > new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days
      if (!isRecent) {
        smokeTestStatus = 'WARN';
        smokeTestReason = 'Last smoke test was over 7 days ago';
      } else if (lastSmokeTest.severity === 'error') {
        smokeTestStatus = 'FAIL';
        smokeTestReason = 'Last smoke test failed';
      } else {
        smokeTestStatus = 'PASS';
        smokeTestReason = undefined;
      }
    }

    checks.push({
      id: 'smoke_tests',
      name: 'Smoke Tests',
      category: 'data',
      status: smokeTestStatus,
      reason: smokeTestReason,
      link: '/admin/system-status#smoke-tests',
    });

    // Check last import parser test
    const { data: lastParserTest } = await supabase
      .from('system_events')
      .select('severity, message, created_at')
      .eq('source', 'smoke_tests_import')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let parserTestStatus: 'PASS' | 'FAIL' | 'WARN' = 'WARN';
    let parserTestReason: string | undefined = 'No import parser tests found';

    if (lastParserTest) {
      const isRecent = new Date(lastParserTest.created_at) > new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days
      if (!isRecent) {
        parserTestStatus = 'WARN';
        parserTestReason = 'Last import parser test was over 2 days ago';
      } else if (lastParserTest.severity === 'error') {
        parserTestStatus = 'FAIL';
        parserTestReason = 'Last import parser test failed';
      } else {
        parserTestStatus = 'PASS';
        parserTestReason = undefined;
      }
    }

    checks.push({
      id: 'parser_tests',
      name: 'Import Parser Tests',
      category: 'data',
      status: parserTestStatus,
      reason: parserTestReason,
      link: '/admin/system-status#import-parser-tests',
    });

    // ========================================
    // 5. OPS CHECKS (DR Drill / Backup Drill)
    // ========================================
    // Check last DR drill was within 30 days
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const { data: lastDrDrill } = await supabase
      .from('dr_drill_runs')
      .select('status, overall_passed, ended_at')
      .eq('status', 'completed')
      .order('ended_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let drDrillStatus: 'PASS' | 'FAIL' | 'WARN' = 'WARN';
    let drDrillReason: string | undefined = 'No DR drill found in last 30 days';

    if (lastDrDrill && lastDrDrill.ended_at) {
      const drillDate = new Date(lastDrDrill.ended_at);
      if (drillDate > thirtyDaysAgo) {
        if (lastDrDrill.overall_passed) {
          drDrillStatus = 'PASS';
          drDrillReason = undefined;
        } else {
          drDrillStatus = 'FAIL';
          drDrillReason = 'Last DR drill failed';
        }
      }
    }

    checks.push({
      id: 'dr_drill',
      name: 'DR Drill (30 days)',
      category: 'ops',
      status: drDrillStatus,
      reason: drDrillReason,
      link: '/admin/system-status#dr-evidence',
    });

    // ========================================
    // BUILD RESULT
    // ========================================
    const passed = checks.filter(c => c.status === 'PASS').length;
    const failed = checks.filter(c => c.status === 'FAIL').length;
    const warnings = checks.filter(c => c.status === 'WARN').length;

    const result: ReadinessResult = {
      status: failed > 0 ? 'NOT_READY' : 'READY',
      evaluatedAt: now.toISOString(),
      checks,
      summary: {
        total: checks.length,
        passed,
        failed,
        warnings,
      },
    };

    // Cache the result
    cachedResult = { data: result, timestamp: Date.now() };

    // Log evaluation to system_events
    await supabase.rpc('rpc_log_system_event', {
      p_source: 'platform_readiness',
      p_severity: failed > 0 ? 'warn' : 'info',
      p_message: `Platform readiness: ${result.status} (${passed}/${checks.length} passed)`,
      p_code: result.status === 'READY' ? 'PLATFORM_READY' : 'PLATFORM_NOT_READY',
      p_meta: {
        actor_id: userId,
        status: result.status,
        failed_checks: checks.filter(c => c.status === 'FAIL').map(c => c.id),
        warning_checks: checks.filter(c => c.status === 'WARN').map(c => c.id),
        summary: result.summary,
      },
      p_env: Deno.env.get('ENVIRONMENT') || 'staging',
    });

    return new Response(JSON.stringify({
      ...result,
      cached: false,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('evaluate-platform-readiness error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
