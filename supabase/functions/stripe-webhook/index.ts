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

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

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

// Helper to handle subscription checkout
async function handleSubscriptionCheckout(
  session: Stripe.Checkout.Session,
  supabaseAdmin: SupabaseClient
) {
  const userId = session.metadata?.user_id;
  const laundryCount = parseInt(session.metadata?.laundry_count || "1", 10);
  const plan = session.metadata?.plan as "monthly" | "annual";

  logStep("Processing subscription checkout", { userId, laundryCount, plan });

  if (!userId) {
    logStep("Missing user_id in metadata");
    return;
  }

  // Calculate subscription dates
  const now = new Date();
  const subscriptionEndDate = plan === "annual" 
    ? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
    : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Update subscription table
  const { error: subscriptionError } = await supabaseAdmin
    .from("subscriptions")
    .update({
      plan_type: plan,
      status: "active",
      subscription_start_date: now.toISOString(),
      subscription_end_date: subscriptionEndDate.toISOString(),
      laundry_count: laundryCount,
      trial_end_date: null, // Clear trial when paid subscription starts
      updated_at: now.toISOString(),
    })
    .eq("user_id", userId);

  if (subscriptionError) {
    logStep("Subscription update error", { error: subscriptionError.message });
    throw new Error(`Failed to update subscription: ${subscriptionError.message}`);
  }

  logStep("Subscription activated successfully", {
    userId,
    plan,
    laundryCount,
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

  logStep("Subscription canceled", { userId });
}

// Helper to handle subscription renewal via invoice
async function handleSubscriptionRenewal(
  invoice: Stripe.Invoice,
  stripe: Stripe,
  supabaseAdmin: SupabaseClient
) {
  const subscriptionId = invoice.subscription as string;
  
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
      laundry_count: laundryCount,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    logStep("Subscription renewal update error", { error: error.message });
    throw new Error(`Failed to update subscription after renewal: ${error.message}`);
  }

  logStep("Subscription renewed", { userId, endDate: currentPeriodEnd.toISOString() });
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
    .select("id")
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
      logStep("Signature verification failed", { error: err instanceof Error ? err.message : String(err) });
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    logStep("Event verified", { type: event.type, id: event.id });

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Determine if this is a subscription or one-time purchase
        if (session.mode === "subscription") {
          await handleSubscriptionCheckout(session, supabaseAdmin);
        } else if (session.mode === "payment") {
          await handleSimulatorPurchase(session, supabaseAdmin);
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
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
