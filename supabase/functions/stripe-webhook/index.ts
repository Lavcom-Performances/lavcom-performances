import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

// Pack configuration - source de vérité
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

    // Handle checkout.session.completed
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      const userId = session.metadata?.user_id;
      const packId = session.metadata?.pack_id;
      const sessionId = session.id;
      const customerId = session.customer as string | null;

      logStep("Processing checkout completed", { userId, packId, sessionId });

      if (!userId || !packId) {
        logStep("Missing metadata", { userId, packId });
        return new Response(JSON.stringify({ error: "Missing user_id or pack_id in metadata" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      const pack = SIMULATOR_PACKS[packId];
      if (!pack) {
        logStep("Invalid pack_id", { packId });
        return new Response(JSON.stringify({ error: "Invalid pack_id" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      // Idempotence check: does this session already exist?
      const { data: existingPurchase } = await supabaseAdmin
        .from("purchases")
        .select("id")
        .eq("stripe_session_id", sessionId)
        .maybeSingle();

      if (existingPurchase) {
        logStep("Purchase already processed (idempotent)", { sessionId });
        return new Response(JSON.stringify({ received: true, message: "Already processed" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Get current profile
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("access_expires_at, max_projects")
        .eq("id", userId)
        .maybeSingle();

      if (profileError) {
        logStep("Profile fetch error", { error: profileError.message });
        throw new Error(`Failed to fetch profile: ${profileError.message}`);
      }

      // Calculate new entitlements (stacking logic)
      const now = new Date();
      const currentExpires = profile?.access_expires_at ? new Date(profile.access_expires_at) : null;
      const baseDate = currentExpires && currentExpires > now ? currentExpires : now;
      const newExpiresAt = new Date(baseDate.getTime() + pack.accessDays * 24 * 60 * 60 * 1000);
      const newMaxProjects = Math.max(profile?.max_projects || 0, pack.maxProjects);

      logStep("Calculating entitlements", {
        currentExpires: currentExpires?.toISOString(),
        baseDate: baseDate.toISOString(),
        newExpiresAt: newExpiresAt.toISOString(),
        currentMaxProjects: profile?.max_projects,
        newMaxProjects,
      });

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
        logStep("Purchase insert error", { error: purchaseError.message });
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
        logStep("Profile update error", { error: updateError.message });
        throw new Error(`Failed to update profile: ${updateError.message}`);
      }

      logStep("Entitlements applied successfully", {
        userId,
        packId,
        expiresAt: newExpiresAt.toISOString(),
        maxProjects: newMaxProjects,
      });
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
