import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper logging function
const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-SUBSCRIPTION-CHECKOUT] ${step}${detailsStr}`);
};

// Price IDs for subscription plans - TO BE CONFIGURED
// You need to create these products/prices in your Stripe dashboard
// Monthly: 29€/month for 1-2 laundries, 25€ for 3-5, 21€ for 6+
// Annual: 10 months paid (2 months free)
const SUBSCRIPTION_PRICES = {
  // 1-2 laundries
  tier1: {
    monthly: "price_MONTHLY_TIER1", // 29€/month - REPLACE WITH YOUR PRICE ID
    annual: "price_ANNUAL_TIER1",   // 290€/year - REPLACE WITH YOUR PRICE ID
  },
  // 3-5 laundries  
  tier2: {
    monthly: "price_MONTHLY_TIER2", // 25€/month per laundry - REPLACE WITH YOUR PRICE ID
    annual: "price_ANNUAL_TIER2",   // 250€/year per laundry - REPLACE WITH YOUR PRICE ID
  },
  // 6+ laundries
  tier3: {
    monthly: "price_MONTHLY_TIER3", // 21€/month per laundry - REPLACE WITH YOUR PRICE ID
    annual: "price_ANNUAL_TIER3",   // 210€/year per laundry - REPLACE WITH YOUR PRICE ID
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

    // Create a Supabase client using the anon key for user authentication
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user?.email) {
      throw new Error("User not authenticated or email not available");
    }
    
    const user = userData.user;
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Parse request body
    const { plan, laundryCount = 1 } = await req.json();
    
    if (!plan || !["monthly", "annual"].includes(plan)) {
      throw new Error("Invalid plan. Must be 'monthly' or 'annual'");
    }

    const tier = getTier(laundryCount);
    const priceId = SUBSCRIPTION_PRICES[tier][plan as "monthly" | "annual"];
    
    logStep("Plan selected", { plan, laundryCount, tier, priceId });

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check if Stripe customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    }

    // Create checkout session
    const origin = req.headers.get("origin") || "https://lavcom.fr";
    
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: priceId,
          quantity: laundryCount,
        },
      ],
      mode: "subscription",
      success_url: `${origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/billing/cancel`,
      metadata: {
        user_id: user.id,
        laundry_count: laundryCount.toString(),
        plan: plan,
        tier: tier,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          laundry_count: laundryCount.toString(),
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
