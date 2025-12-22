import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mapping pack ID -> Stripe price ID + config
const SIMULATOR_PACKS: Record<string, { priceId: string; accessDays: number; maxProjects: number; amountTtc: number }> = {
  essential: { priceId: "price_1Sh8OBB849ikvSjD4vraisPU", accessDays: 30, maxProjects: 1, amountTtc: 79 },
  project: { priceId: "price_1Sh8P9B849ikvSjD2wT6zlUp", accessDays: 90, maxProjects: 3, amountTtc: 149 },
  comparator: { priceId: "price_1Sh8Q0B849ikvSjDyDYUvewo", accessDays: 180, maxProjects: 10, amountTtc: 229 },
  premium: { priceId: "price_1Sh8Q0B849ikvSjDyDYUvewo", accessDays: 90, maxProjects: 3, amountTtc: 279 },
};

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
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const { packId } = await req.json();
    logStep("Pack requested", { packId });

    const pack = SIMULATOR_PACKS[packId];
    if (!pack) {
      throw new Error(`Invalid pack ID: ${packId}`);
    }
    logStep("Pack found", { priceId: pack.priceId, accessDays: pack.accessDays });

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

    // Create checkout session (one-time payment)
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
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
        user_id: user.id,
        pack_id: packId,
      },
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
