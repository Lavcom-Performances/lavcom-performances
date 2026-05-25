// supabase/functions/create-simulator-lead/index.ts
// Inserts lead into DB with anti-abuse guards (honeypot, min-time, IP rate limit),
// then triggers email summary fire-and-forget.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

// --- Anti-abuse thresholds ---
const MIN_ELAPSED_MS = 1500;           // Reject submissions faster than 1.5s
const RATE_LIMIT_PER_MINUTE = 3;       // Max 3 leads / IP / minute
const RATE_LIMIT_PER_DAY = 15;         // Max 15 leads / IP / day

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
  // Anti-abuse fields
  website?: string;       // Honeypot — must be empty
  elapsed_ms?: number;    // Time spent on form before submit
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip + "|simulator-lead-salt");
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function triggerEmailSummary(payload: LeadPayload, supabaseUrl: string, anonKey: string): Promise<void> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-simulator-summary`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": anonKey },
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
        pricing_snapshot: payload.pricing_snapshot ?? null,
      }),
    });

    if (!response.ok) {
      console.warn("Email trigger failed:", await response.text());
    } else {
      console.log("Email summary triggered for:", payload.email);
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

    // --- Honeypot: if filled, silently accept (don't tip off bots) ---
    if (payload.website && payload.website.trim() !== "") {
      console.warn("Honeypot triggered, ignoring submission");
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Min fill-time guard ---
    if (typeof payload.elapsed_ms === "number" && payload.elapsed_ms < MIN_ELAPSED_MS) {
      console.warn("Submission too fast:", payload.elapsed_ms, "ms");
      return new Response(JSON.stringify({ error: "Soumission trop rapide, réessayez." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    // --- Supabase client ---
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // --- Rate limit by IP ---
    const ip = getClientIp(req);
    const ipHash = await hashIp(ip);
    const now = Date.now();
    const oneMinuteAgo = new Date(now - 60_000).toISOString();
    const oneDayAgo = new Date(now - 86_400_000).toISOString();

    const { count: minuteCount } = await supabase
      .from("simulator_lead_rate_limits")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", oneMinuteAgo);

    if ((minuteCount ?? 0) >= RATE_LIMIT_PER_MINUTE) {
      console.warn("Rate limit (per-minute) exceeded for IP hash:", ipHash);
      return new Response(JSON.stringify({ error: "Trop de tentatives, patientez une minute." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { count: dayCount } = await supabase
      .from("simulator_lead_rate_limits")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", oneDayAgo);

    if ((dayCount ?? 0) >= RATE_LIMIT_PER_DAY) {
      console.warn("Rate limit (per-day) exceeded for IP hash:", ipHash);
      return new Response(JSON.stringify({ error: "Limite quotidienne atteinte." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Record this attempt (fire-and-forget)
    void supabase.from("simulator_lead_rate_limits").insert({
      ip_hash: ipHash,
      email: payload.email.toLowerCase().trim(),
    });

    // --- Insert lead ---
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
    }

    // --- Trigger email (fire-and-forget) ---
    const emailPromise = triggerEmailSummary(payload, supabaseUrl, anonKey);
    try {
      // @ts-ignore — EdgeRuntime available in Supabase Edge Functions
      EdgeRuntime.waitUntil(emailPromise);
    } catch {
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
