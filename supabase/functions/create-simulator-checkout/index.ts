import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { checkFeatureOrBlock } from "../_shared/feature-flags.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Mapping pack ID -> Stripe price ID + config
const SIMULATOR_PACKS: Record<string, { priceId: string; accessDays: number; maxProjects: number; amountTtc: number }> = {
  essential: { priceId: "price_1Sh8OBB849ikvSjD4vraisPU", accessDays: 30, maxProjects: 1, amountTtc: 79 },
  project: { priceId: "price_1Sh8P9B849ikvSjD2wT6zlUp", accessDays: 90, maxProjects: 3, amountTtc: 149 },
  comparator: { priceId: "price_1Sh8Q0B849ikvSjDyDYUvewo", accessDays: 180, maxProjects: 10, amountTtc: 229 },
  premium: { priceId: "price_1Sh8QjB849ikvSjDvYjSHo57", accessDays: 90, maxProjects: 3, amountTtc: 279 },
};

// Emails autorisés à accéder gratuitement (aucun paiement requis)
const BYPASS_EMAILS = new Set([
  "yohana@lavcom.fr",
  "yoann.misericordia@laposte.net",
  "illies.kaleche@hotmail.fr",
  "rnaranjoromero@gmail.com",
]);

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-SIMULATOR-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Function started");

    // TAEX-223: Check feature flag
    const flagCheck = await checkFeatureOrBlock(supabaseClient, 'stripe_checkout_enabled', 'Stripe Checkout');
    if (!flagCheck.allowed) {
      return flagCheck.response;
    }

    const { packId } = await req.json();
    logStep("Pack requested", { packId });

    const pack = SIMULATOR_PACKS[packId];
    if (!pack) {
      throw new Error(`Invalid pack ID: ${packId}`);
    }
    logStep("Pack found", { priceId: pack.priceId, accessDays: pack.accessDays });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Try to authenticate user (optional - supports guest checkout)
    const authHeader = req.headers.get("Authorization");
    let user: { id: string; email: string } | null = null;
    let customerId: string | undefined;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabaseClient.auth.getUser(token);
      if (data.user?.email) {
        user = { id: data.user.id, email: data.user.email };
        logStep("User authenticated", { userId: user.id, email: user.email });

        // Check if customer exists for authenticated user
        const customers = await stripe.customers.list({ email: user.email, limit: 1 });
        if (customers.data.length > 0) {
          customerId = customers.data[0].id;
          logStep("Existing customer found", { customerId });
        }
      }
    }

    if (!user) {
      logStep("Guest checkout - no authenticated user");
    }

    // Determine URLs based on origin
    const origin = req.headers.get("origin") || "https://app.lavcom.fr";
    const successUrl = `${origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/billing/cancel`;

    // Create checkout session (one-time payment)
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      line_items: [
        {
          price: pack.priceId,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        user_id: user?.id || 'guest',
        pack_id: packId,
      },
      saved_payment_method_options: {
        payment_method_save: 'disabled',
      },
    };

    // If we have a customer ID, use it; otherwise let Stripe collect email
    if (customerId) {
      sessionParams.customer = customerId;
    } else {
      // For guests, Stripe will collect email during checkout
      sessionParams.customer_creation = 'always';
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
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
