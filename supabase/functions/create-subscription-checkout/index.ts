import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { checkFeatureOrBlock } from "../_shared/feature-flags.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper logging function
const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-SUBSCRIPTION-CHECKOUT] ${step}${detailsStr}`);
};

// ============================================
// ALLOWLIST: Prix autorisés pour "Accès Lavcom Performances"
// ============================================
const ALLOWED_PRICE_IDS: Record<string, { tier: string; interval: "month" | "year" }> = {
  // Tier 1 (1-2 laveries)
  "price_1ShGd1B849ikvSjDddCJJA4c": { tier: "tier1", interval: "month" }, // 29€/mois
  "price_1ShGinB849ikvSjDbjYUTkdw": { tier: "tier1", interval: "year" },  // 290€/an
  // Tier 2 (3-5 laveries)
  "price_1ShGeVB849ikvSjD3LIR8UtE": { tier: "tier2", interval: "month" }, // 25€/mois/laverie
  "price_1ShGjEB849ikvSjD4VnQGXQO": { tier: "tier2", interval: "year" },  // 250€/an/laverie
  // Tier 3 (6+ laveries)
  "price_1ShGetB849ikvSjDs2aIkeYS": { tier: "tier3", interval: "month" }, // 21€/mois/laverie
  "price_1ShGjaB849ikvSjDIWARPdI2": { tier: "tier3", interval: "year" },  // 210€/an/laverie
};

// Price IDs for subscription plans (legacy mapping from plan + laundryCount)
const SUBSCRIPTION_PRICES = {
  tier1: {
    monthly: "price_1ShGd1B849ikvSjDddCJJA4c",
    annual: "price_1ShGinB849ikvSjDbjYUTkdw",
  },
  tier2: {
    monthly: "price_1ShGeVB849ikvSjD3LIR8UtE",
    annual: "price_1ShGjEB849ikvSjD4VnQGXQO",
  },
  tier3: {
    monthly: "price_1ShGetB849ikvSjDs2aIkeYS",
    annual: "price_1ShGjaB849ikvSjDIWARPdI2",
  },
};

function getTier(laundryCount: number): "tier1" | "tier2" | "tier3" {
  if (laundryCount <= 2) return "tier1";
  if (laundryCount <= 5) return "tier2";
  return "tier3";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // TAEX-223: Check feature flag using service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });
    
    const flagCheck = await checkFeatureOrBlock(supabaseAdmin, 'stripe_checkout_enabled', 'Stripe Checkout');
    if (!flagCheck.allowed) {
      return flagCheck.response;
    }

    // Create a Supabase client using the anon key for user authentication
    const supabaseClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Authenticate user - JWT required
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided - JWT required");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user?.email) {
      throw new Error("User not authenticated or email not available");
    }
    
    const user = userData.user;
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Parse request body
    const body = await req.json();
    const { price_id, plan, laundryCount = 1, success_url, cancel_url } = body;
    
    // Determine which price_id to use
    let finalPriceId: string;
    let priceInfo: { tier: string; interval: "month" | "year" };
    
    if (price_id) {
      // Direct price_id provided - validate against allowlist
      if (!ALLOWED_PRICE_IDS[price_id]) {
        logStep("Invalid price_id - not in allowlist", { price_id });
        throw new Error("Invalid price_id: not in allowed list");
      }
      finalPriceId = price_id;
      priceInfo = ALLOWED_PRICE_IDS[price_id];
      logStep("Using direct price_id", { price_id: finalPriceId, ...priceInfo });
    } else if (plan) {
      // Legacy: use plan + laundryCount to determine price
      if (!["monthly", "annual"].includes(plan)) {
        throw new Error("Invalid plan. Must be 'monthly' or 'annual'");
      }
      const tier = getTier(laundryCount);
      finalPriceId = SUBSCRIPTION_PRICES[tier][plan as "monthly" | "annual"];
      priceInfo = { tier, interval: plan === "annual" ? "year" : "month" };
      logStep("Resolved price from plan", { plan, laundryCount, tier, priceId: finalPriceId });
    } else {
      throw new Error("Either price_id or plan must be provided");
    }

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check if Stripe customer exists, create if not
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string;
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    } else {
      // Create new Stripe customer
      const newCustomer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.id,
        },
      });
      customerId = newCustomer.id;
      logStep("Created new Stripe customer", { customerId });
      
      // Store customer ID in profile (optional, for faster lookups)
      try {
        await supabaseAdmin
          .from("profiles")
          .update({ stripe_customer_id: customerId })
          .eq("id", user.id);
        logStep("Stored customer ID in profile");
      } catch (profileErr) {
        // Non-blocking - continue even if profile update fails
        logStep("Warning: failed to store customer ID in profile", { error: String(profileErr) });
      }
    }

    // Build URLs
    const origin = req.headers.get("origin") || "https://app.lavcom.fr";
    const finalSuccessUrl = success_url || `${origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`;
    const finalCancelUrl = cancel_url || `${origin}/billing/cancel`;

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: finalPriceId,
          quantity: laundryCount,
        },
      ],
      mode: "subscription",
      success_url: finalSuccessUrl,
      cancel_url: finalCancelUrl,
      allow_promotion_codes: true,
      metadata: {
        user_id: user.id,
        laundry_count: laundryCount.toString(),
        tier: priceInfo.tier,
        interval: priceInfo.interval,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          laundry_count: laundryCount.toString(),
          tier: priceInfo.tier,
        },
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
