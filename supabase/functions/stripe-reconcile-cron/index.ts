import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Anomaly types
type AnomalyType = 
  | 'MISSING_STRIPE_IDS'
  | 'STRIPE_NOT_FOUND'
  | 'STATUS_MISMATCH'
  | 'PERIOD_END_MISMATCH'
  | 'INVOICE_MISSING_URL'
  | 'MULTIPLE_ACTIVE_SUBS';

interface ReconcileResult {
  total_checked: number;
  fixed_count: number;
  anomalies: Record<AnomalyType, number>;
  anomaly_details: Array<{
    type: AnomalyType;
    user_id: string;
    stripe_customer_id?: string | null;
    stripe_subscription_id?: string | null;
    db_status?: string;
    stripe_status?: string;
    details?: string;
  }>;
}

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-RECONCILE] ${step}${detailsStr}`);
};

// Log system event
async function logSystemEvent(
  supabaseAdmin: SupabaseClient,
  severity: 'info' | 'warn' | 'error' | 'critical',
  code: string,
  message: string,
  meta?: Record<string, unknown>
) {
  const env = Deno.env.get('STRIPE_SECRET_KEY')?.startsWith('sk_test_') ? 'preview' : 'prod';
  
  try {
    await supabaseAdmin.rpc('rpc_log_system_event', {
      p_env: env,
      p_source: 'stripe_reconcile',
      p_severity: severity,
      p_code: code,
      p_message: message,
      p_meta: meta || {}
    });
  } catch (err) {
    console.error('[STRIPE-RECONCILE] Failed to log system event:', err);
  }
}

// Send alert via send-system-alert function
async function sendAlert(
  severity: 'warn' | 'error' | 'critical',
  code: string,
  message: string,
  meta: Record<string, unknown>
) {
  const env = Deno.env.get('STRIPE_SECRET_KEY')?.startsWith('sk_test_') ? 'preview' : 'prod';
  
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
        env,
        source: 'stripe_reconcile',
        severity,
        code,
        message,
        meta
      })
    });
    logStep('Alert sent', { severity, code });
  } catch (alertError) {
    console.error('[STRIPE-RECONCILE] Failed to send alert:', alertError);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  logStep("Reconciliation started");

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!stripeKey || !supabaseUrl || !supabaseServiceKey) {
    return new Response(
      JSON.stringify({ error: "Missing required environment variables" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  });

  const result: ReconcileResult = {
    total_checked: 0,
    fixed_count: 0,
    anomalies: {
      MISSING_STRIPE_IDS: 0,
      STRIPE_NOT_FOUND: 0,
      STATUS_MISMATCH: 0,
      PERIOD_END_MISMATCH: 0,
      INVOICE_MISSING_URL: 0,
      MULTIPLE_ACTIVE_SUBS: 0,
    },
    anomaly_details: [],
  };

  try {
    // Query DB subscriptions that should be reconciled
    const { data: dbSubscriptions, error: dbError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .in('status', ['active', 'trialing', 'past_due']);

    if (dbError) {
      throw new Error(`Failed to fetch subscriptions: ${dbError.message}`);
    }

    logStep("Fetched DB subscriptions", { count: dbSubscriptions?.length || 0 });

    for (const dbSub of dbSubscriptions || []) {
      result.total_checked++;

      // Check for missing Stripe IDs
      // SKIP trial subscriptions without Stripe IDs - this is expected behavior
      // Trials only get Stripe IDs when user converts to paid plan
      if (!dbSub.stripe_subscription_id || !dbSub.stripe_customer_id) {
        if (dbSub.plan_type === 'trial') {
          // This is expected - trials don't have Stripe IDs until conversion
          logStep("Skipping trial without Stripe IDs (expected)", { user_id: dbSub.user_id });
          continue;
        }
        
        // Non-trial subscription missing Stripe IDs is an anomaly
        result.anomalies.MISSING_STRIPE_IDS++;
        result.anomaly_details.push({
          type: 'MISSING_STRIPE_IDS',
          user_id: dbSub.user_id,
          stripe_customer_id: dbSub.stripe_customer_id,
          stripe_subscription_id: dbSub.stripe_subscription_id,
          db_status: dbSub.status,
          details: 'Paid subscription active but missing Stripe IDs',
        });
        continue;
      }

      try {
        // Fetch Stripe subscription
        const stripeSub = await stripe.subscriptions.retrieve(dbSub.stripe_subscription_id);

        // Check for multiple active subscriptions for same customer
        const activeSubsForCustomer = await stripe.subscriptions.list({
          customer: dbSub.stripe_customer_id,
          status: 'active',
          limit: 10,
        });
        
        if (activeSubsForCustomer.data.length > 1) {
          result.anomalies.MULTIPLE_ACTIVE_SUBS++;
          result.anomaly_details.push({
            type: 'MULTIPLE_ACTIVE_SUBS',
            user_id: dbSub.user_id,
            stripe_customer_id: dbSub.stripe_customer_id,
            details: `Customer has ${activeSubsForCustomer.data.length} active subscriptions`,
          });
        }

        // Compare status
        const stripeStatus = stripeSub.status;
        const dbStatus = dbSub.status;
        
        // Map Stripe statuses to DB statuses
        const statusNeedsUpdate = (
          (stripeStatus === 'canceled' && dbStatus !== 'canceled') ||
          (stripeStatus === 'unpaid' && dbStatus !== 'past_due') ||
          (stripeStatus === 'active' && dbStatus !== 'active') ||
          (stripeStatus === 'past_due' && dbStatus !== 'past_due') ||
          (stripeStatus === 'trialing' && dbStatus !== 'trialing')
        );

        if (statusNeedsUpdate) {
          result.anomalies.STATUS_MISMATCH++;
          result.anomaly_details.push({
            type: 'STATUS_MISMATCH',
            user_id: dbSub.user_id,
            stripe_customer_id: dbSub.stripe_customer_id,
            stripe_subscription_id: dbSub.stripe_subscription_id,
            db_status: dbStatus,
            stripe_status: stripeStatus,
            details: `Status mismatch: DB=${dbStatus}, Stripe=${stripeStatus}`,
          });

          // Fix status
          const newStatus = stripeStatus === 'unpaid' ? 'past_due' : stripeStatus;
          const { error: updateError } = await supabaseAdmin
            .from('subscriptions')
            .update({ 
              status: newStatus,
              updated_at: new Date().toISOString(),
            })
            .eq('id', dbSub.id);

          if (!updateError) {
            result.fixed_count++;
            logStep("Fixed status mismatch", { user_id: dbSub.user_id, oldStatus: dbStatus, newStatus });
          }
        }

        // Compare period_end
        const stripePeriodEnd = new Date(stripeSub.current_period_end * 1000);
        const dbPeriodEnd = dbSub.current_period_end ? new Date(dbSub.current_period_end) : null;
        
        // Allow 1 day tolerance for period_end comparison
        const periodEndDiffMs = dbPeriodEnd 
          ? Math.abs(stripePeriodEnd.getTime() - dbPeriodEnd.getTime())
          : Infinity;
        const oneDayMs = 24 * 60 * 60 * 1000;

        if (periodEndDiffMs > oneDayMs) {
          result.anomalies.PERIOD_END_MISMATCH++;
          result.anomaly_details.push({
            type: 'PERIOD_END_MISMATCH',
            user_id: dbSub.user_id,
            stripe_customer_id: dbSub.stripe_customer_id,
            stripe_subscription_id: dbSub.stripe_subscription_id,
            details: `Period end mismatch: DB=${dbPeriodEnd?.toISOString()}, Stripe=${stripePeriodEnd.toISOString()}`,
          });

          // Fix period_end
          const { error: updateError } = await supabaseAdmin
            .from('subscriptions')
            .update({ 
              current_period_end: stripePeriodEnd.toISOString(),
              subscription_end_date: stripePeriodEnd.toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', dbSub.id);

          if (!updateError) {
            result.fixed_count++;
            logStep("Fixed period_end mismatch", { user_id: dbSub.user_id });
          }
        }

        // Check for last invoice URL
        if (stripeSub.latest_invoice && !dbSub.last_invoice_url) {
          const invoice = typeof stripeSub.latest_invoice === 'string'
            ? await stripe.invoices.retrieve(stripeSub.latest_invoice)
            : stripeSub.latest_invoice;

          if (invoice.hosted_invoice_url) {
            result.anomalies.INVOICE_MISSING_URL++;
            result.anomaly_details.push({
              type: 'INVOICE_MISSING_URL',
              user_id: dbSub.user_id,
              stripe_subscription_id: dbSub.stripe_subscription_id,
              details: 'Invoice URL missing in DB',
            });

            // Fix invoice URL
            const { error: updateError } = await supabaseAdmin
              .from('subscriptions')
              .update({ 
                last_invoice_url: invoice.hosted_invoice_url,
                updated_at: new Date().toISOString(),
              })
              .eq('id', dbSub.id);

            if (!updateError) {
              result.fixed_count++;
              logStep("Fixed missing invoice URL", { user_id: dbSub.user_id });
            }
          }
        }

      } catch (stripeError) {
        // Subscription not found in Stripe
        if ((stripeError as { code?: string }).code === 'resource_missing') {
          result.anomalies.STRIPE_NOT_FOUND++;
          result.anomaly_details.push({
            type: 'STRIPE_NOT_FOUND',
            user_id: dbSub.user_id,
            stripe_subscription_id: dbSub.stripe_subscription_id,
            db_status: dbSub.status,
            details: 'Stripe subscription not found',
          });
        } else {
          logStep("Stripe API error", { 
            user_id: dbSub.user_id, 
            error: (stripeError as Error).message 
          });
        }
      }
    }

    const duration_ms = Date.now() - startTime;
    const totalAnomalies = Object.values(result.anomalies).reduce((a, b) => a + b, 0);

    logStep("Reconciliation completed", {
      total_checked: result.total_checked,
      fixed_count: result.fixed_count,
      total_anomalies: totalAnomalies,
      duration_ms,
    });

    // Log to system_events
    const severity = totalAnomalies > 0 || result.fixed_count > 0 ? 'warn' : 'info';
    await logSystemEvent(
      supabaseAdmin,
      severity,
      'RECONCILE_COMPLETE',
      `Stripe reconciliation: ${result.total_checked} checked, ${result.fixed_count} fixed, ${totalAnomalies} anomalies`,
      {
        total_checked: result.total_checked,
        fixed_count: result.fixed_count,
        anomalies: result.anomalies,
        duration_ms,
      }
    );

    // Send alert if anomalies or fixes
    if (totalAnomalies > 0 || result.fixed_count > 0) {
      const anomalyBreakdown = Object.entries(result.anomalies)
        .filter(([, count]) => count > 0)
        .map(([type, count]) => `${type}: ${count}`)
        .join(', ');

      await sendAlert(
        totalAnomalies > 5 ? 'error' : 'warn',
        'RECONCILE_ANOMALIES',
        `Stripe reconciliation found issues - Fixed: ${result.fixed_count}, Anomalies: ${totalAnomalies} (${anomalyBreakdown})`,
        {
          total_checked: result.total_checked,
          fixed_count: result.fixed_count,
          anomalies: result.anomalies,
          anomaly_details: result.anomaly_details.slice(0, 20), // Limit to first 20
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        ...result,
        duration_ms,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logStep("Reconciliation failed", { error: errorMessage });

    await logSystemEvent(
      supabaseAdmin,
      'error',
      'RECONCILE_FAILED',
      `Stripe reconciliation failed: ${errorMessage}`,
      { error: errorMessage }
    );

    await sendAlert(
      'error',
      'RECONCILE_FAILED',
      `Stripe reconciliation cron failed: ${errorMessage}`,
      { error: errorMessage }
    );

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
