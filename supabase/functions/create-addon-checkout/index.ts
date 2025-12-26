import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Add-on pricing configuration by tier
// addon_kind -> tier -> { priceId, amount }
const ADDON_PRICES: Record<string, Record<string, { priceId: string; amountTtc: number }>> = {
  extension_30d: {
    essential: { priceId: "price_1Sh8SIB849ikvSjD6XKmxDUP", amountTtc: 39 },
    project: { priceId: "price_1ShdNZB849ikvSjDFNIwsP7W", amountTtc: 59 },
    comparator: { priceId: "price_1ShdPqB849ikvSjDqaT6HxEK", amountTtc: 79 },
  },
  project_plus1: {
    essential: { priceId: "price_1Sh8RcB849ikvSjDFSw33u5y", amountTtc: 29 },
    project: { priceId: "price_1ShdWYB849ikvSjDxfYSBpi8", amountTtc: 39 },
    comparator: { priceId: "price_1ShdXNB849ikvSjDXhk7fmE5", amountTtc: 49 },
  },
};

// Add-on configuration
const ADDON_CONFIG: Record<string, { days?: number; projectsDelta?: number }> = {
  extension_30d: { days: 30 },
  project_plus1: { projectsDelta: 1 },
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-ADDON-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const { addon_kind, tier } = await req.json();
    logStep("Add-on requested", { addon_kind, tier });

    // Validate addon_kind
    if (!ADDON_PRICES[addon_kind]) {
      throw new Error(`Invalid addon_kind: ${addon_kind}`);
    }

    // Validate tier for this addon
    const tierPricing = ADDON_PRICES[addon_kind][tier];
    if (!tierPricing) {
      throw new Error(`Invalid tier "${tier}" for addon "${addon_kind}"`);
    }

    const addonConfig = ADDON_CONFIG[addon_kind];
    logStep("Add-on config found", { priceId: tierPricing.priceId, config: addonConfig });

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if customer exists, create if not
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    } else {
      const newCustomer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      });
      customerId = newCustomer.id;
      logStep("New customer created", { customerId });
    }

    // Use app.lavcom.fr as fixed domain for production
    const successUrl = `https://app.lavcom.fr/billing/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `https://app.lavcom.fr/billing/cancel`;

    // Build metadata for webhook processing
    const metadata: Record<string, string> = {
      user_id: user.id,
      addon_kind,
      tier,
      type: "addon",
    };

    if (addonConfig.days) {
      metadata.days = String(addonConfig.days);
    }
    if (addonConfig.projectsDelta) {
      metadata.projects_delta = String(addonConfig.projectsDelta);
    }

    // Create checkout session (one-time payment)
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: tierPricing.priceId,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata,
      saved_payment_method_options: {
        payment_method_save: 'disabled',
      },
    });
    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
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
