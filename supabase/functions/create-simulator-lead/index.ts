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
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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

    // Validation
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

    // Supabase insert with service role
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

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
    });

    if (error) {
      console.error("Supabase insert error:", error);
      return new Response(JSON.stringify({ success: false, error: "DB error" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(JSON.stringify({ success: false }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
