import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VALIDATE-INVITATION] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { token } = await req.json();
    
    if (!token || typeof token !== 'string' || token.length < 10) {
      logStep("Invalid token format");
      return new Response(
        JSON.stringify({ 
          status: 'not_found',
          error: 'Token invalide' 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    logStep("Token received", { tokenLength: token.length });

    // Use service role to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Query invitation by token
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('team_invitations')
      .select('id, email, role, organization_id, expires_at, accepted_at')
      .eq('token', token)
      .maybeSingle();

    if (invitationError) {
      logStep("Database error", { error: invitationError.message });
      throw new Error("Erreur de base de données");
    }

    if (!invitation) {
      logStep("Invitation not found");
      return new Response(
        JSON.stringify({ status: 'not_found' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    logStep("Invitation found", { invitationId: invitation.id });

    // Check if already accepted
    if (invitation.accepted_at) {
      logStep("Invitation already accepted");
      return new Response(
        JSON.stringify({ status: 'already_accepted' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      logStep("Invitation expired", { expiresAt: invitation.expires_at });
      return new Response(
        JSON.stringify({ status: 'expired' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Get organization name
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('name')
      .eq('id', invitation.organization_id)
      .single();

    logStep("Invitation valid", { organizationName: org?.name });

    // Return invitation data (without token for security)
    return new Response(
      JSON.stringify({
        status: 'valid',
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          organization_id: invitation.organization_id,
          organization_name: org?.name || 'Organisation',
          expires_at: invitation.expires_at,
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ status: 'error', error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
