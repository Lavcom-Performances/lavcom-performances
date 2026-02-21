// supabase/functions/create-simulator-lead/index.ts — Phase 6
// Inserts lead into DB, then triggers email summary fire-and-forget

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

interface LeadPayload {
  email: string;
  stage: string;
  capital_range: string;
  machine_range: string;
  zone_selected?: string;
  estimated_monthly_revenue: number;
  estimated_annual_revenue: number;
  pricing_snapshot?: Record<string, unknown>;
  ici_score: number;
  gap_score: number;
  segmentation_type: "segment_a" | "segment_b" | "segment_c" | "segment_d";
  ab_variant?: "A" | "B";
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Fire-and-forget email trigger — never blocks the insert response
async function triggerEmailSummary(payload: LeadPayload, supabaseUrl: string, anonKey: string): Promise<void> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-simulator-summary`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": anonKey,
      },
      body: JSON.stringify({
        email: payload.email,
        segmentation_type: payload.segmentation_type,
        ici_score: payload.ici_score,
        gap_score: payload.gap_score,
        stage: payload.stage,
        capital_range: payload.capital_range,
        machine_range: payload.machine_range,
        estimated_monthly_revenue: payload.estimated_monthly_revenue,
        estimated_annual_revenue: payload.estimated_annual_revenue,
      }),
    });

    if (!response.ok) {
      console.warn("Email trigger failed:", await response.text());
    } else {
      const body = await response.text();
      console.log("Email summary triggered for:", payload.email, body);
    }
  } catch (err) {
    console.error("Email trigger error (non-blocking):", err);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const payload: LeadPayload = await req.json();

    // --- Validation ---
    if (!payload.email || !isValidEmail(payload.email)) {
      return new Response(JSON.stringify({ error: "Email invalide" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["segment_a", "segment_b", "segment_c", "segment_d"].includes(payload.segmentation_type)) {
      return new Response(JSON.stringify({ error: "Segment invalide" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (typeof payload.ici_score !== "number" || payload.ici_score < 0 || payload.ici_score > 100) {
      return new Response(JSON.stringify({ error: "Score ICI invalide" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Supabase insert ---
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { error } = await supabase.from("simulator_leads").insert({
      email: payload.email.toLowerCase().trim(),
      stage: payload.stage,
      capital_range: payload.capital_range,
      machine_range: payload.machine_range,
      zone_selected: payload.zone_selected ?? null,
      estimated_monthly_revenue: payload.estimated_monthly_revenue,
      estimated_annual_revenue: payload.estimated_annual_revenue,
      pricing_snapshot: payload.pricing_snapshot ?? null,
      ici_score: payload.ici_score,
      gap_score: payload.gap_score,
      segmentation_type: payload.segmentation_type,
      ab_variant: payload.ab_variant ?? "A",
    });

    if (error) {
      console.error("Supabase insert error:", error);
      // Still return success to not block user flow; email may still be sent
    }

    // --- Trigger email (fire-and-forget) ---
    const emailPromise = triggerEmailSummary(payload, supabaseUrl, anonKey);

    try {
      // @ts-ignore — EdgeRuntime available in Supabase Edge Functions
      EdgeRuntime.waitUntil(emailPromise);
    } catch {
      // Fallback: await it (adds latency but ensures delivery)
      await emailPromise;
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("create-simulator-lead error:", err);
    return new Response(JSON.stringify({ success: false }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
