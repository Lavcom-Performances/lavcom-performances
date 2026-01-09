import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

// Pack configuration - source de vérité (for simulator one-time purchases)
const SIMULATOR_PACKS: Record<string, { accessDays: number; maxProjects: number; amountTtc: number }> = {
  essential: { accessDays: 30, maxProjects: 1, amountTtc: 79 },
  project: { accessDays: 90, maxProjects: 3, amountTtc: 149 },
  comparator: { accessDays: 180, maxProjects: 10, amountTtc: 229 },
  premium: { accessDays: 90, maxProjects: 3, amountTtc: 279 },
};

// Add-on pricing configuration by tier
const ADDON_PRICES: Record<string, Record<string, number>> = {
  extension_30d: {
    essential: 39,
    project: 59,
    comparator: 79,
  },
  project_plus1: {
    essential: 29,
    project: 39,
  },
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

// Helper to log system events and send alerts for critical ones
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
      p_source: 'stripe-webhook',
      p_severity: severity,
      p_code: code,
      p_message: message,
      p_meta: meta || {}
    });
  } catch (err) {
    console.error('[STRIPE-WEBHOOK] Failed to log system event:', err);
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
          env,
          source: 'stripe-webhook',
          severity,
          code,
          message,
          meta: meta || {}
        })
      });
      logStep('Alert email sent', { severity, code });
    } catch (alertError) {
      console.error('[STRIPE-WEBHOOK] Failed to send alert:', alertError);
    }
  }
}

// Helper to send subscription emails
async function sendSubscriptionEmail(
  type: "activation" | "renewal" | "payment_failed" | "cancellation",
  to: string,
  data?: { planType?: string; endDate?: string; invoiceUrl?: string; firstName?: string }
) {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const response = await fetch(`${supabaseUrl}/functions/v1/send-subscription-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, type, data }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      logStep("Email send failed", { type, to, error });
    } else {
      logStep("Email sent successfully", { type, to });
    }
  } catch (err) {
    logStep("Email send error", { type, to, error: err instanceof Error ? err.message : String(err) });
  }
}

// Helper to upsert invoice into stripe_invoices for sales dashboard
async function upsertStripeInvoice(
  invoice: Stripe.Invoice,
  supabaseAdmin: SupabaseClient
) {
  const stripeInvoiceId = invoice.id;
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
  const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;

  // Try to find user_id from subscriptions table
  let userId: string | null = null;
  if (subscriptionId) {
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_subscription_id', subscriptionId)
      .maybeSingle();
    userId = sub?.user_id || null;
  }
  if (!userId && customerId) {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle();
    userId = profile?.id || null;
  }

  // Build lines array with proper typing
  const lines = invoice.lines?.data?.map((line: { price?: { id?: string }; description?: string; amount?: number; quantity?: number }) => ({
    price_id: line.price?.id || null,
    description: line.description || null,
    amount: line.amount || 0,
    quantity: line.quantity || 1,
  })) || [];

  const invoiceData = {
    stripe_invoice_id: stripeInvoiceId,
    stripe_customer_id: customerId || null,
    stripe_subscription_id: subscriptionId || null,
    user_id: userId,
    customer_email: invoice.customer_email || null,
    status: invoice.status || null,
    currency: invoice.currency || 'eur',
    amount_total: invoice.total || null,
    amount_subtotal: invoice.subtotal || null,
    amount_tax: invoice.tax || null,
    created_at: invoice.created ? new Date(invoice.created * 1000).toISOString() : null,
    paid_at: invoice.status === 'paid' && invoice.status_transitions?.paid_at 
      ? new Date(invoice.status_transitions.paid_at * 1000).toISOString() 
      : null,
    hosted_invoice_url: invoice.hosted_invoice_url || null,
    invoice_pdf: invoice.invoice_pdf || null,
    lines: lines,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabaseAdmin
    .from('stripe_invoices')
    .upsert(invoiceData, { onConflict: 'stripe_invoice_id' });

  if (error) {
    logStep('Failed to upsert stripe_invoice', { error: error.message, stripeInvoiceId });
  } else {
    logStep('Invoice upserted to stripe_invoices', { stripeInvoiceId, status: invoice.status });
  }
}
// Helper to handle simulator one-time purchase
async function handleSimulatorPurchase(
  session: Stripe.Checkout.Session,
  supabaseAdmin: SupabaseClient
) {
  const userId = session.metadata?.user_id;
  const packId = session.metadata?.pack_id;
  const sessionId = session.id;
  const customerId = session.customer as string | null;

  logStep("Processing simulator checkout", { userId, packId, sessionId });

  if (!userId || !packId) {
    logStep("Missing metadata for simulator purchase", { userId, packId });
    return;
  }

  const pack = SIMULATOR_PACKS[packId];
  if (!pack) {
    logStep("Invalid pack_id", { packId });
    return;
  }

  // Idempotence check
  const { data: existingPurchase } = await supabaseAdmin
    .from("purchases")
    .select("id")
    .eq("stripe_session_id", sessionId)
    .maybeSingle();

  if (existingPurchase) {
    logStep("Purchase already processed (idempotent)", { sessionId });
    return;
  }

  // Get current profile
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("access_expires_at, max_projects")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    throw new Error(`Failed to fetch profile: ${profileError.message}`);
  }

  // Calculate new entitlements (stacking logic)
  const now = new Date();
  const currentExpires = profile?.access_expires_at ? new Date(profile.access_expires_at) : null;
  const baseDate = currentExpires && currentExpires > now ? currentExpires : now;
  const newExpiresAt = new Date(baseDate.getTime() + pack.accessDays * 24 * 60 * 60 * 1000);
  const newMaxProjects = Math.max(profile?.max_projects || 0, pack.maxProjects);

  // Insert purchase record
  const { error: purchaseError } = await supabaseAdmin
    .from("purchases")
    .insert({
      user_id: userId,
      plan_code: packId,
      stripe_session_id: sessionId,
      stripe_customer_id: customerId,
      amount_ttc: pack.amountTtc,
      currency: "eur",
      access_days: pack.accessDays,
      max_projects: pack.maxProjects,
    });

  if (purchaseError) {
    throw new Error(`Failed to insert purchase: ${purchaseError.message}`);
  }

  // Update profile entitlements
  const { error: updateError } = await supabaseAdmin
    .from("profiles")
    .update({
      access_expires_at: newExpiresAt.toISOString(),
      max_projects: newMaxProjects,
      plan_code: packId,
      last_purchase_at: now.toISOString(),
    })
    .eq("id", userId);

  if (updateError) {
    throw new Error(`Failed to update profile: ${updateError.message}`);
  }

  logStep("Simulator purchase applied successfully", { userId, packId });
}

// Helper to handle add-on purchase (extension_30d or project_plus1)
async function handleAddonPurchase(
  session: Stripe.Checkout.Session,
  supabaseAdmin: SupabaseClient
) {
  const userId = session.metadata?.user_id;
  const addonKind = session.metadata?.addon_kind;
  const tier = session.metadata?.tier;
  const days = session.metadata?.days ? parseInt(session.metadata.days, 10) : null;
  const projectsDelta = session.metadata?.projects_delta ? parseInt(session.metadata.projects_delta, 10) : null;
  const sessionId = session.id;
  const customerId = session.customer as string | null;

  logStep("Processing add-on purchase", { userId, addonKind, tier, days, projectsDelta });

  if (!userId || !addonKind || !tier) {
    logStep("Missing metadata for add-on purchase", { userId, addonKind, tier });
    return;
  }

  // Get amount from config
  const tierPricing = ADDON_PRICES[addonKind]?.[tier];
  if (tierPricing === undefined) {
    logStep("Invalid add-on or tier", { addonKind, tier });
    return;
  }

  // Idempotence check
  const { data: existingPurchase } = await supabaseAdmin
    .from("purchases")
    .select("id")
    .eq("stripe_session_id", sessionId)
    .maybeSingle();

  if (existingPurchase) {
    logStep("Add-on purchase already processed (idempotent)", { sessionId });
    return;
  }

  // Get current profile
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("access_expires_at, max_projects")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    throw new Error(`Failed to fetch profile: ${profileError.message}`);
  }

  const now = new Date();
  let newExpiresAt = profile?.access_expires_at ? new Date(profile.access_expires_at) : null;
  let newMaxProjects = profile?.max_projects || 0;

  // Apply best-of stacking rules
  if (addonKind === "extension_30d" && days) {
    // expires_at = GREATEST(current_expires_at, now) + 30 days
    const baseDate = newExpiresAt && newExpiresAt > now ? newExpiresAt : now;
    newExpiresAt = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
    logStep("Extension applied", { baseDate, newExpiresAt });
  }

  if (addonKind === "project_plus1" && projectsDelta) {
    // projects_limit = current_projects_limit + 1
    newMaxProjects = newMaxProjects + projectsDelta;
    logStep("Project delta applied", { oldMaxProjects: profile?.max_projects, newMaxProjects });
  }

  // Insert purchase record
  const { error: purchaseError } = await supabaseAdmin
    .from("purchases")
    .insert({
      user_id: userId,
      plan_code: `addon_${addonKind}_${tier}`,
      stripe_session_id: sessionId,
      stripe_customer_id: customerId,
      amount_ttc: tierPricing,
      currency: "eur",
      access_days: days || 0,
      max_projects: projectsDelta || 0,
    });

  if (purchaseError) {
    throw new Error(`Failed to insert add-on purchase: ${purchaseError.message}`);
  }

  // Update profile entitlements
  const updateData: Record<string, unknown> = {
    last_purchase_at: now.toISOString(),
  };
  
  if (newExpiresAt) {
    updateData.access_expires_at = newExpiresAt.toISOString();
  }
  if (newMaxProjects !== profile?.max_projects) {
    updateData.max_projects = newMaxProjects;
  }

  const { error: updateError } = await supabaseAdmin
    .from("profiles")
    .update(updateData)
    .eq("id", userId);

  if (updateError) {
    throw new Error(`Failed to update profile for add-on: ${updateError.message}`);
  }

  logStep("Add-on purchase applied successfully", { userId, addonKind, tier, newExpiresAt, newMaxProjects });
}

async function handleSubscriptionCheckout(
  session: Stripe.Checkout.Session,
  supabaseAdmin: SupabaseClient
) {
  const userId = session.metadata?.user_id;
  const laundryCount = parseInt(session.metadata?.laundry_count || "1", 10);
  const tier = session.metadata?.tier || "tier1";
  const interval = session.metadata?.interval as "month" | "year" || "month";
  const subscriptionId = session.subscription as string;
  const customerId = session.customer as string;
  const customerEmail = session.customer_email;

  logStep("Processing subscription checkout", { userId, laundryCount, tier, interval, subscriptionId });

  if (!userId) {
    logStep("Missing user_id in metadata");
    return;
  }

  // Calculate subscription dates based on interval
  const now = new Date();
  const subscriptionEndDate = interval === "year" 
    ? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
    : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Update subscription table with Stripe IDs and tier info
  const { error: subscriptionError } = await supabaseAdmin
    .from("subscriptions")
    .update({
      plan_type: interval === "year" ? "annual" : "monthly",
      status: "active",
      subscription_start_date: now.toISOString(),
      subscription_end_date: subscriptionEndDate.toISOString(),
      current_period_end: subscriptionEndDate.toISOString(),
      laundry_count: laundryCount,
      trial_end_date: null, // Clear trial when paid subscription starts
      stripe_subscription_id: subscriptionId,
      stripe_customer_id: customerId,
      updated_at: now.toISOString(),
    })
    .eq("user_id", userId);

  if (subscriptionError) {
    logStep("Subscription update error", { error: subscriptionError.message });
    throw new Error(`Failed to update subscription: ${subscriptionError.message}`);
  }

  // Also store customer ID in profile for faster lookups
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .update({ stripe_customer_id: customerId })
    .eq("id", userId)
    .select("first_name, email")
    .single();

  // Send activation email
  if (customerEmail || profile?.email) {
    const planName = interval === "year" ? "Annuel" : "Mensuel";
    await sendSubscriptionEmail("activation", customerEmail || profile?.email, {
      planType: `${planName} - ${laundryCount} laverie${laundryCount > 1 ? 's' : ''}`,
      firstName: profile?.first_name || undefined,
    });
  }

  logStep("Subscription activated successfully", {
    userId,
    tier,
    interval,
    laundryCount,
    subscriptionId,
    customerId,
    endDate: subscriptionEndDate.toISOString(),
  });
}

// Helper to handle subscription updates (renewals, changes)
async function handleSubscriptionUpdate(
  subscription: Stripe.Subscription,
  supabaseAdmin: SupabaseClient
) {
  const userId = subscription.metadata?.user_id;
  
  if (!userId) {
    logStep("No user_id in subscription metadata, skipping");
    return;
  }

  const status = subscription.status;
  const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
  const laundryCount = parseInt(subscription.metadata?.laundry_count || "1", 10);

  // Determine plan type from price interval
  const priceInterval = subscription.items.data[0]?.price?.recurring?.interval;
  const planType = priceInterval === "year" ? "annual" : "monthly";

  const { error } = await supabaseAdmin
    .from("subscriptions")
    .update({
      plan_type: planType,
      status: status === "active" ? "active" : status,
      subscription_end_date: currentPeriodEnd.toISOString(),
      laundry_count: laundryCount,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    logStep("Subscription update error", { error: error.message });
    throw new Error(`Failed to update subscription: ${error.message}`);
  }

  logStep("Subscription updated", { userId, status, endDate: currentPeriodEnd.toISOString() });
}

// Helper to handle subscription cancellation/deletion
async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  supabaseAdmin: SupabaseClient
) {
  const userId = subscription.metadata?.user_id;
  
  if (!userId) {
    logStep("No user_id in subscription metadata, skipping");
    return;
  }

  const currentPeriodEnd = new Date(subscription.current_period_end * 1000);

  const { error } = await supabaseAdmin
    .from("subscriptions")
    .update({
      status: "canceled",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    logStep("Subscription cancellation error", { error: error.message });
    throw new Error(`Failed to cancel subscription: ${error.message}`);
  }

  // Get profile for email
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("email, first_name")
    .eq("id", userId)
    .single();

  // Send cancellation email
  if (profile?.email) {
    await sendSubscriptionEmail("cancellation", profile.email, {
      firstName: profile.first_name || undefined,
      endDate: currentPeriodEnd.toLocaleDateString("fr-FR"),
    });
  }

  logStep("Subscription canceled", { userId });
}

// Helper to handle subscription renewal via invoice
async function handleSubscriptionRenewal(
  invoice: Stripe.Invoice,
  stripe: Stripe,
  supabaseAdmin: SupabaseClient
) {
  const subscriptionId = invoice.subscription as string;
  const invoiceUrl = invoice.hosted_invoice_url || invoice.invoice_pdf || null;
  const customerEmail = invoice.customer_email;
  
  // Get the subscription to access metadata
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const userId = subscription.metadata?.user_id;

  if (!userId) {
    logStep("No user_id in subscription metadata for renewal");
    return;
  }

  const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
  const laundryCount = parseInt(subscription.metadata?.laundry_count || "1", 10);
  const priceInterval = subscription.items.data[0]?.price?.recurring?.interval;
  const planType = priceInterval === "year" ? "annual" : "monthly";

  const { error } = await supabaseAdmin
    .from("subscriptions")
    .update({
      plan_type: planType,
      status: "active",
      subscription_end_date: currentPeriodEnd.toISOString(),
      current_period_end: currentPeriodEnd.toISOString(),
      laundry_count: laundryCount,
      last_invoice_url: invoiceUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    logStep("Subscription renewal update error", { error: error.message });
    throw new Error(`Failed to update subscription after renewal: ${error.message}`);
  }

  // Get profile for email
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("first_name, email")
    .eq("id", userId)
    .single();

  // Send renewal email
  if (customerEmail || profile?.email) {
    await sendSubscriptionEmail("renewal", customerEmail || profile?.email, {
      firstName: profile?.first_name || undefined,
      endDate: currentPeriodEnd.toLocaleDateString("fr-FR"),
      invoiceUrl: invoiceUrl || undefined,
    });
  }

  logStep("Subscription renewed", { userId, endDate: currentPeriodEnd.toISOString(), invoiceUrl });
}

// Helper to handle invoice payment failed
async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
  supabaseAdmin: SupabaseClient
) {
  const customerEmail = invoice.customer_email;
  if (!customerEmail) {
    logStep("No customer email in invoice, skipping");
    return;
  }

  // Find profile by email
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, first_name")
    .eq("email", customerEmail)
    .maybeSingle();

  if (!profile) {
    logStep("No profile found for email", { email: customerEmail });
    return;
  }

  const { error } = await supabaseAdmin
    .from("subscriptions")
    .update({
      status: "past_due",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", profile.id);

  if (error) {
    logStep("Subscription past_due update error", { error: error.message });
    throw new Error(`Failed to update subscription status: ${error.message}`);
  }

  // Send payment failed email
  await sendSubscriptionEmail("payment_failed", customerEmail, {
    firstName: profile.first_name || undefined,
  });

  logStep("Subscription marked as past_due", { userId: profile.id });
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Webhook received");

    // Verify Stripe signature
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      throw new Error("No stripe-signature header");
    }

    const body = await req.text();
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET not configured");
    }

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logStep("Signature verification failed", { error: errorMsg });
      await logSystemEvent(supabaseAdmin, 'critical', 'WEBHOOK_SIG_FAIL', 'Stripe signature verification failed', { error: errorMsg });
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    logStep("Event verified", { type: event.type, id: event.id });

    // Idempotence check: skip if event already processed
    const { data: existingEvent } = await supabaseAdmin
      .from("stripe_events")
      .select("event_id")
      .eq("event_id", event.id)
      .maybeSingle();

    if (existingEvent) {
      logStep("Event already processed (idempotent)", { eventId: event.id });
      return new Response(JSON.stringify({ received: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Record event for idempotence before processing
    const { error: insertError } = await supabaseAdmin
      .from("stripe_events")
      .insert({
        event_id: event.id,
        event_type: event.type,
        payload: event.data.object,
        processed_at: new Date().toISOString(),
      });

    if (insertError) {
      logStep("Failed to record event", { error: insertError.message });
    } else {
      logStep("Event recorded for idempotence", { eventId: event.id });
    }

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Determine if this is a subscription, add-on, or pack purchase
        if (session.mode === "subscription") {
          await handleSubscriptionCheckout(session, supabaseAdmin);
        } else if (session.mode === "payment") {
          // Check if this is an add-on or a pack purchase
          if (session.metadata?.type === "addon") {
            await handleAddonPurchase(session, supabaseAdmin);
          } else {
            await handleSimulatorPurchase(session, supabaseAdmin);
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription, supabaseAdmin);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription, supabaseAdmin);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice, supabaseAdmin);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        // Handle subscription renewal
        if (invoice.subscription) {
          await handleSubscriptionRenewal(invoice, stripe, supabaseAdmin);
        }
        break;
      }

      case "invoice.paid":
      case "invoice.finalized": {
        // Store invoice in stripe_invoices for sales dashboard
        const invoice = event.data.object as Stripe.Invoice;
        await upsertStripeInvoice(invoice, supabaseAdmin);
        // Also handle renewal for invoice.paid
        if (event.type === "invoice.paid" && invoice.subscription) {
          await handleSubscriptionRenewal(invoice, stripe, supabaseAdmin);
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    await logSystemEvent(supabaseAdmin, 'error', 'WEBHOOK_ERROR', 'Stripe webhook processing error', { error: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
