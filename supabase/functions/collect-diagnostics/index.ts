import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAuth, isPlatformAdmin, getServiceClient } from "../_shared/auth.ts";
import { assertPlatformMfaOr403 } from "../_shared/mfa.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Secrets manifest (kept in sync with src/config/secretsManifest.ts)
const secretsManifest = [
  { name: 'CRON_SECRET', severity: 'blocker' },
  { name: 'STRIPE_SECRET_KEY', severity: 'blocker' },
  { name: 'STRIPE_WEBHOOK_SECRET', severity: 'blocker' },
  { name: 'RESEND_API_KEY', severity: 'blocker' },
  { name: 'SLACK_WEBHOOK_URL', severity: 'warn' },
  { name: 'DEMO_SITE_ID_ALLOWLIST', severity: 'warn' },
  { name: 'SCREENSHOTONE_API_KEY', severity: 'warn' },
];

interface DiagnosticsRequest {
  site_id?: string;
  date_from?: string;
  date_to?: string;
}

interface DiagnosticsBundle {
  generated_at: string;
  generated_by: { user_id: string; email?: string };
  filters: { site_id?: string; date_from?: string; date_to?: string };
  environment: {
    supabase_url: string;
    region: string;
    node_version: string;
  };
  secrets_health: Array<{ name: string; status: 'PRESENT' | 'MISSING'; severity: string }>;
  system_events: unknown[];
  failed_cron_runs: unknown[];
  stripe_reconcile_summary: unknown | null;
  import_parser_tests: unknown | null;
  recompute_analytics_runs: unknown[];
  storage_summary: { buckets_count: number; diagnostics_bundles_count: number };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // TAEX-232: Enforce MFA for platform admins
    const mfaCheck = await assertPlatformMfaOr403(req, 'access_secrets');
    if (!mfaCheck.allowed) {
      return mfaCheck.response!;
    }

    const userId = mfaCheck.userId!;
    const userEmail = mfaCheck.userEmail;

    // Check platform admin role (MFA already verified authentication)
    const isAdmin = await isPlatformAdmin(userId);
    if (!isAdmin) {
      console.warn(`[collect-diagnostics] Non-admin access attempt by ${userId}`);
      
      // Log unauthorized attempt
      const serviceClient = getServiceClient();
      await serviceClient.rpc('rpc_log_system_event', {
        p_env: 'prod',
        p_source: 'diagnostics',
        p_severity: 'warn',
        p_code: 'UNAUTHORIZED_ACCESS',
        p_message: `Non-admin tried to collect diagnostics`,
        p_meta: { user_id: userId }
      });

      return new Response(
        JSON.stringify({ error: 'Forbidden - platform admin only' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    let filters: DiagnosticsRequest = {};
    try {
      const body = await req.json();
      filters = {
        site_id: body.site_id || undefined,
        date_from: body.date_from || undefined,
        date_to: body.date_to || undefined,
      };
    } catch {
      // No body is fine
    }

    console.log(`[collect-diagnostics] Collecting bundle for admin ${userId}`, filters);

    const serviceClient = getServiceClient();

    // 1. Environment summary (no secrets)
    const environment = {
      supabase_url: Deno.env.get('SUPABASE_URL') || 'unknown',
      region: 'eu-central-1',
      node_version: Deno.version.deno,
    };

    // 2. Secrets health (PRESENT/MISSING only)
    const secretsHealth = secretsManifest.map(secret => ({
      name: secret.name,
      status: Deno.env.get(secret.name) ? 'PRESENT' as const : 'MISSING' as const,
      severity: secret.severity,
    }));

    // 3. System events (last 50, filtered)
    let eventsQuery = serviceClient
      .from('system_events')
      .select('id, created_at, env, source, severity, code, message')
      .order('created_at', { ascending: false })
      .limit(50);

    if (filters.date_from) {
      eventsQuery = eventsQuery.gte('created_at', filters.date_from);
    }
    if (filters.date_to) {
      eventsQuery = eventsQuery.lte('created_at', filters.date_to + 'T23:59:59Z');
    }

    const { data: systemEvents } = await eventsQuery;

    // 4. Failed cron runs (last 20)
    const { data: failedCrons } = await serviceClient
      .from('cron_logs')
      .select('id, job_name, status, error_message, started_at, completed_at, duration_ms')
      .eq('status', 'error')
      .order('started_at', { ascending: false })
      .limit(20);

    // 5. Stripe reconcile summary (latest from system_events)
    const { data: stripeReconcile } = await serviceClient
      .from('system_events')
      .select('created_at, message, meta')
      .eq('source', 'stripe-reconcile')
      .order('created_at', { ascending: false })
      .limit(1);

    // 6. Import parser tests (latest)
    const { data: parserTests } = await serviceClient
      .from('system_events')
      .select('created_at, message, meta')
      .eq('source', 'import-parser-tests')
      .order('created_at', { ascending: false })
      .limit(1);

    // 7. Recompute analytics runs (last 5)
    const { data: recomputeRuns } = await serviceClient
      .from('system_events')
      .select('created_at, message, meta')
      .eq('source', 'recompute-analytics')
      .order('created_at', { ascending: false })
      .limit(5);

    // 8. Storage summary
    const { count: bundlesCount } = await serviceClient
      .from('diagnostics_bundles')
      .select('id', { count: 'exact', head: true });

    // Build bundle
    const bundle: DiagnosticsBundle = {
      generated_at: new Date().toISOString(),
      generated_by: { user_id: userId, email: userEmail },
      filters,
      environment,
      secrets_health: secretsHealth,
      system_events: systemEvents || [],
      failed_cron_runs: failedCrons || [],
      stripe_reconcile_summary: stripeReconcile?.[0] || null,
      import_parser_tests: parserTests?.[0] || null,
      recompute_analytics_runs: recomputeRuns || [],
      storage_summary: {
        buckets_count: 3, // Known buckets
        diagnostics_bundles_count: bundlesCount || 0,
      },
    };

    // Generate file path
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = `diagnostics-${timestamp}.json`;
    const fileContent = JSON.stringify(bundle, null, 2);
    const fileBytes = new TextEncoder().encode(fileContent);

    // Upload to storage
    const { error: uploadError } = await serviceClient.storage
      .from('diagnostics-bundles')
      .upload(filePath, fileBytes, {
        contentType: 'application/json',
        upsert: false,
      });

    if (uploadError) {
      console.error('[collect-diagnostics] Upload failed:', uploadError);
      throw new Error(`Failed to upload bundle: ${uploadError.message}`);
    }

    // Create signed URL (5 minutes)
    const { data: signedUrlData, error: signedUrlError } = await serviceClient.storage
      .from('diagnostics-bundles')
      .createSignedUrl(filePath, 300);

    if (signedUrlError) {
      console.error('[collect-diagnostics] Signed URL failed:', signedUrlError);
      throw new Error(`Failed to create signed URL: ${signedUrlError.message}`);
    }

    // Save metadata to table
    const bundleSummary = {
      events_count: systemEvents?.length || 0,
      failed_crons_count: failedCrons?.length || 0,
      missing_secrets: secretsHealth.filter(s => s.status === 'MISSING').length,
      blocker_secrets_missing: secretsHealth.filter(s => s.status === 'MISSING' && s.severity === 'blocker').length,
    };

    const { data: bundleRecord, error: insertError } = await serviceClient
      .from('diagnostics_bundles')
      .insert({
        actor_id: userId,
        actor_email: userEmail,
        site_id: filters.site_id || null,
        date_from: filters.date_from || null,
        date_to: filters.date_to || null,
        file_path: filePath,
        file_size_bytes: fileBytes.length,
        bundle_summary: bundleSummary,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('[collect-diagnostics] Insert failed:', insertError);
    }

    // Audit log
    await serviceClient.rpc('rpc_create_audit_log', {
      p_actor_id: userId,
      p_action: 'DIAGNOSTICS_COLLECT',
      p_target_table: 'diagnostics_bundles',
      p_target_id: bundleRecord?.id || null,
      p_metadata: { filters, summary: bundleSummary },
    });

    // System event
    await serviceClient.rpc('rpc_log_system_event', {
      p_env: 'prod',
      p_source: 'diagnostics',
      p_severity: 'info',
      p_code: 'BUNDLE_CREATED',
      p_message: `Diagnostics bundle created by ${userEmail}`,
      p_meta: { bundle_id: bundleRecord?.id, summary: bundleSummary },
    });

    console.log(`[collect-diagnostics] Bundle created: ${filePath}`);

    return new Response(
      JSON.stringify({
        success: true,
        bundle_id: bundleRecord?.id,
        file_path: filePath,
        download_url: signedUrlData?.signedUrl,
        expires_in_seconds: 300,
        summary: bundleSummary,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[collect-diagnostics] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
