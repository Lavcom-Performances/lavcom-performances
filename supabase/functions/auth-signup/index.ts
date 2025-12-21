import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  checkRateLimit, 
  hashIP, 
  maskEmail, 
  rateLimitResponse 
} from "../_shared/rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SignupRequest {
  email: string;
  password: string;
  metadata?: {
    first_name?: string;
    last_name?: string;
    company_name?: string;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Parse request body
    const { email, password, metadata }: SignupRequest = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Email and password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get client IP for rate limiting
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() 
      || req.headers.get("x-real-ip") 
      || "unknown";
    
    const ipHash = await hashIP(clientIP);
    
    // Create combined identifier: ip_hash + email_hash for more precise limiting
    // This prevents both IP-based spam AND email-based abuse
    const emailHash = await hashIP(email.toLowerCase());
    const combinedIdentifier = `${ipHash}:${emailHash}`;

    console.log(`[auth-signup] Attempt from IP hash: ${ipHash}, email: ${maskEmail(email)}`);

    // Check rate limit: 5 attempts per hour (scope: auth/signup)
    const rateLimitResult = await checkRateLimit(
      supabaseUrl,
      supabaseServiceKey,
      "auth/signup",
      combinedIdentifier,
      ipHash
    );

    if (!rateLimitResult.allowed) {
      console.log(`[auth-signup] Rate limit exceeded for ${maskEmail(email)}, cooldown: ${rateLimitResult.cooldownSeconds}s`);
      return rateLimitResponse(rateLimitResult.cooldownSeconds!, "auth/signup", corsHeaders);
    }

    console.log(`[auth-signup] Rate limit OK, remaining: ${rateLimitResult.remaining}`);

    // Create Supabase client with anon key for signup (not service role)
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Perform signup
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });

    if (error) {
      console.log(`[auth-signup] Signup error for ${maskEmail(email)}: ${error.message}`);
      return new Response(
        JSON.stringify({ 
          error: error.message,
          // Preserve Supabase error codes for client handling
          code: error.status || 400
        }),
        { 
          status: error.status || 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log(`[auth-signup] Success for ${maskEmail(email)}`);

    return new Response(
      JSON.stringify({ 
        user: data.user,
        session: data.session,
        // Include rate limit info for transparency
        rateLimit: {
          remaining: rateLimitResult.remaining,
          resetIn: rateLimitResult.resetIn
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[auth-signup] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
