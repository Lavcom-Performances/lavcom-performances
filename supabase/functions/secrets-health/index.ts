import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { assertPlatformMfaOr403 } from '../_shared/mfa.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Secrets manifest (duplicated from frontend for edge function isolation)
interface SecretDefinition {
  name: string;
  purpose: string;
  usedBy: string[];
  severity: 'blocker' | 'warn';
  required: boolean;
  impactIfMissing: string;
}

const secretsManifest: SecretDefinition[] = [
  // Required
  { name: 'CRON_SECRET', purpose: 'Authenticates scheduled cron jobs', usedBy: ['compute-analytics-cron', 'stripe-reconcile-cron'], severity: 'blocker', required: true, impactIfMissing: 'All scheduled jobs will fail' },
  { name: 'STRIPE_SECRET_KEY', purpose: 'Server-side Stripe API access', usedBy: ['stripe-webhook', 'create-subscription-checkout'], severity: 'blocker', required: true, impactIfMissing: 'Payment operations will fail' },
  { name: 'STRIPE_WEBHOOK_SECRET', purpose: 'Validates Stripe webhook signatures', usedBy: ['stripe-webhook'], severity: 'blocker', required: true, impactIfMissing: 'Stripe events not processed' },
  { name: 'RESEND_API_KEY', purpose: 'Email delivery via Resend', usedBy: ['send-contact', 'send-team-invitation', 'trial-reminder'], severity: 'blocker', required: true, impactIfMissing: 'No emails will be sent' },
  // Optional
  { name: 'SLACK_WEBHOOK_URL', purpose: 'Slack notifications for alerts', usedBy: ['send-system-alert', 'send-cron-alert'], severity: 'warn', required: false, impactIfMissing: 'Slack alerts disabled' },
  { name: 'DEMO_SITE_ID_ALLOWLIST', purpose: 'Sites allowed for DR drill', usedBy: ['run-dr-drill'], severity: 'warn', required: false, impactIfMissing: 'DR drills blocked' },
  { name: 'SCREENSHOTONE_API_KEY', purpose: 'DR drill screenshot capture', usedBy: ['run-dr-drill'], severity: 'warn', required: false, impactIfMissing: 'Screenshots not captured' },
  { name: 'SIRENE_API_KEY', purpose: 'French SIRET company lookup', usedBy: ['fetch-from-siret'], severity: 'warn', required: false, impactIfMissing: 'SIRET lookup unavailable' },
];

interface SecretStatus {
  name: string;
  status: 'PRESENT' | 'MISSING';
  purpose: string;
  usedBy: string[];
  severity: 'blocker' | 'warn';
  required: boolean;
  impactIfMissing: string;
}

Deno.serve(async (req) => {
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

    // Verify super_admin role (MFA check already verified auth)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: platformRole } = await supabase
      .from('platform_roles')
      .select('role')
      .eq('user_id', userId)
      .in('role', ['super_admin'])
      .maybeSingle();

    if (!platformRole) {
      // Log unauthorized access attempt
      await supabase.rpc('rpc_log_system_event', {
        p_source: 'secrets-health',
        p_severity: 'warn',
        p_message: 'Unauthorized secrets-health access attempt (admin without super_admin)',
        p_code: 'SECRETS_HEALTH_UNAUTHORIZED',
        p_meta: { actor_id: userId },
        p_env: Deno.env.get('ENVIRONMENT') || 'staging',
      });

      return new Response(JSON.stringify({ error: 'Forbidden: super_admin only' }), { 
        status: 403, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Check each secret's presence (NEVER log or return values)
    const results: SecretStatus[] = secretsManifest.map(secret => {
      const value = Deno.env.get(secret.name);
      // Only check if it exists and has content, never expose the value
      const isPresent = value !== undefined && value !== null && value.trim().length > 0;

      return {
        name: secret.name,
        status: isPresent ? 'PRESENT' : 'MISSING',
        purpose: secret.purpose,
        usedBy: secret.usedBy,
        severity: secret.severity,
        required: secret.required,
        impactIfMissing: secret.impactIfMissing,
      };
    });

    const missingBlockers = results.filter(r => r.status === 'MISSING' && r.severity === 'blocker');
    const missingWarnings = results.filter(r => r.status === 'MISSING' && r.severity === 'warn');

    // Log the check
    await supabase.rpc('rpc_log_system_event', {
      p_source: 'secrets-health',
      p_severity: missingBlockers.length > 0 ? 'error' : 'info',
      p_message: `Secrets health check: ${missingBlockers.length} blockers, ${missingWarnings.length} warnings missing`,
      p_code: 'SECRETS_HEALTH_CHECK',
      p_meta: {
        actor_id: userId,
        missing_blockers: missingBlockers.map(s => s.name),
        missing_warnings: missingWarnings.map(s => s.name),
        total_secrets: results.length,
        total_present: results.filter(r => r.status === 'PRESENT').length,
      },
      p_env: Deno.env.get('ENVIRONMENT') || 'staging',
    });

    return new Response(JSON.stringify({
      success: true,
      checkedAt: new Date().toISOString(),
      summary: {
        total: results.length,
        present: results.filter(r => r.status === 'PRESENT').length,
        missingBlockers: missingBlockers.length,
        missingWarnings: missingWarnings.length,
        allBlockersPresent: missingBlockers.length === 0,
      },
      secrets: results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('secrets-health error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
