import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ACCEPT-INVITATION] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logStep("No authorization header");
      return new Response(
        JSON.stringify({ success: false, error: "Non autorisé" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const { token } = await req.json();
    
    if (!token || typeof token !== 'string' || token.length < 10) {
      logStep("Invalid token format");
      return new Response(
        JSON.stringify({ success: false, error: 'Token invalide' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    logStep("Token received", { tokenLength: token.length });

    // Create user client to get authenticated user
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false }
      }
    );

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      logStep("User not authenticated", { error: userError?.message });
      return new Response(
        JSON.stringify({ success: false, error: "Non autorisé" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    logStep("User authenticated", { userId: user.id, email: user.email });

    // Use service role to bypass RLS for admin operations
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
      return new Response(
        JSON.stringify({ success: false, error: "Erreur de base de données" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    if (!invitation) {
      logStep("Invitation not found");
      return new Response(
        JSON.stringify({ success: false, error: "Invitation non trouvée" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    logStep("Invitation found", { invitationId: invitation.id, invitationEmail: invitation.email });

    // Check if already accepted
    if (invitation.accepted_at) {
      logStep("Invitation already accepted");
      return new Response(
        JSON.stringify({ success: false, error: "Cette invitation a déjà été acceptée" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      logStep("Invitation expired", { expiresAt: invitation.expires_at });
      return new Response(
        JSON.stringify({ success: false, error: "Cette invitation a expiré" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Verify email matches (case-insensitive)
    if (invitation.email.toLowerCase() !== user.email?.toLowerCase()) {
      logStep("Email mismatch", { invitationEmail: invitation.email, userEmail: user.email });
      return new Response(
        JSON.stringify({ success: false, error: "Cette invitation ne correspond pas à votre email" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    // Check if user already has a role in this organization
    const { data: existingRole } = await supabaseAdmin
      .from('user_roles')
      .select('id')
      .eq('user_id', user.id)
      .eq('organization_id', invitation.organization_id)
      .maybeSingle();

    if (existingRole) {
      logStep("User already has role in organization");
      // Mark invitation as accepted anyway
      await supabaseAdmin
        .from('team_invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invitation.id);
      
      return new Response(
        JSON.stringify({ success: true, message: "Vous êtes déjà membre de cette organisation" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Create user role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: user.id,
        organization_id: invitation.organization_id,
        role: invitation.role
      });

    if (roleError) {
      logStep("Failed to create user role", { error: roleError.message });
      return new Response(
        JSON.stringify({ success: false, error: "Erreur lors de la création du rôle" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    logStep("User role created", { role: invitation.role, organizationId: invitation.organization_id });

    // Mark invitation as accepted
    const { error: updateError } = await supabaseAdmin
      .from('team_invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invitation.id);

    if (updateError) {
      logStep("Failed to update invitation", { error: updateError.message });
      // Role was created, so we consider this a success
    }

    // Get organization name for response
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('name')
      .eq('id', invitation.organization_id)
      .single();

    logStep("Invitation accepted successfully", { organizationName: org?.name });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Vous avez rejoint l'organisation ${org?.name || 'Organisation'}`,
        organization_id: invitation.organization_id,
        role: invitation.role
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
