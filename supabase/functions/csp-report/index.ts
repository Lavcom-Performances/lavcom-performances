import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CSPViolationReport {
  "csp-report"?: {
    "document-uri"?: string;
    "violated-directive"?: string;
    "effective-directive"?: string;
    "original-policy"?: string;
    "blocked-uri"?: string;
    disposition?: string;
    "status-code"?: number;
    "source-file"?: string;
    "line-number"?: number;
    "column-number"?: number;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    let report: CSPViolationReport;

    // CSP reports can come as application/csp-report or application/json
    if (
      contentType.includes("application/csp-report") ||
      contentType.includes("application/json")
    ) {
      report = await req.json();
    } else {
      console.log("[CSP-Report] Unsupported content-type:", contentType);
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const violation = report["csp-report"];
    if (!violation) {
      console.log("[CSP-Report] No csp-report in payload:", report);
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Log the violation for monitoring
    console.log("[CSP-Report] Violation received:", {
      documentUri: violation["document-uri"],
      violatedDirective: violation["violated-directive"],
      effectiveDirective: violation["effective-directive"],
      blockedUri: violation["blocked-uri"],
      sourceFile: violation["source-file"],
      lineNumber: violation["line-number"],
      disposition: violation.disposition,
      timestamp: new Date().toISOString(),
    });

    // Return 204 No Content as per CSP spec
    return new Response(null, { status: 204, headers: corsHeaders });
  } catch (error) {
    console.error("[CSP-Report] Error processing report:", error);
    // Still return 204 to not break browser reporting
    return new Response(null, { status: 204, headers: corsHeaders });
  }
});
