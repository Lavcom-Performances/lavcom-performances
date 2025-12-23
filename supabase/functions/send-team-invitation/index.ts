import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InvitationRequest {
  email: string;
  role: string;
  organizationId: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const resendFromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'noreply@lavcom.fr';

    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header');
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create user client to verify permissions
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error('User auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email, role, organizationId }: InvitationRequest = await req.json();
    console.log(`Invitation request: ${email} as ${role} to org ${organizationId}`);

    // Validate inputs
    if (!email || !role || !organizationId) {
      return new Response(
        JSON.stringify({ error: 'Email, rôle et organisation requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is admin of this organization
    const { data: isAdmin } = await supabaseAdmin.rpc('is_org_admin', {
      _user_id: user.id,
      _org_id: organizationId
    });

    if (!isAdmin) {
      console.error('User is not admin of organization');
      return new Response(
        JSON.stringify({ error: 'Vous n\'êtes pas administrateur de cette organisation' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if invitation already exists
    const { data: existingInvite } = await supabaseAdmin
      .from('team_invitations')
      .select('id, accepted_at')
      .eq('organization_id', organizationId)
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (existingInvite) {
      if (existingInvite.accepted_at) {
        return new Response(
          JSON.stringify({ error: 'Cet utilisateur a déjà accepté une invitation' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      // Delete old invitation and create new one
      await supabaseAdmin
        .from('team_invitations')
        .delete()
        .eq('id', existingInvite.id);
    }

    // Check if user already exists in organization
    const { data: existingUser } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (existingUser) {
      const { data: existingRole } = await supabaseAdmin
        .from('user_roles')
        .select('id')
        .eq('user_id', existingUser.id)
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (existingRole) {
        return new Response(
          JSON.stringify({ error: 'Cet utilisateur fait déjà partie de l\'organisation' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Create invitation
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from('team_invitations')
      .insert({
        organization_id: organizationId,
        email: email.toLowerCase(),
        role: role,
        invited_by: user.id
      })
      .select()
      .single();

    if (inviteError) {
      console.error('Error creating invitation:', inviteError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la création de l\'invitation' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Invitation created:', invitation.id);

    // Get organization name
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('name')
      .eq('id', organizationId)
      .single();

    // Get inviter profile
    const { data: inviterProfile } = await supabaseAdmin
      .from('profiles')
      .select('first_name, last_name, company_name')
      .eq('id', user.id)
      .single();

    const inviterName = inviterProfile?.first_name && inviterProfile?.last_name
      ? `${inviterProfile.first_name} ${inviterProfile.last_name}`
      : inviterProfile?.company_name || 'Un membre';

    // Build invitation URL
    const siteUrl = Deno.env.get('SITE_URL') || `${supabaseUrl.replace('.supabase.co', '.lovable.app')}`;
    const invitationUrl = `${siteUrl}/invitation?token=${invitation.token}`;

    // Send email via Resend if configured
    if (resendApiKey) {
      try {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: resendFromEmail,
            to: email,
            subject: `Invitation à rejoindre ${org?.name || 'Lavcom'}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #A3C615;">Vous êtes invité(e) !</h2>
                <p>${inviterName} vous invite à rejoindre <strong>${org?.name || 'l\'organisation'}</strong> sur Lavcom.</p>
                <p>Rôle proposé : <strong>${role}</strong></p>
                <p style="margin: 30px 0;">
                  <a href="${invitationUrl}" 
                     style="background-color: #A3C615; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    Accepter l'invitation
                  </a>
                </p>
                <p style="color: #666; font-size: 14px;">
                  Cette invitation expire dans 7 jours.
                </p>
                <p style="color: #999; font-size: 12px;">
                  Si vous n'attendiez pas cette invitation, vous pouvez ignorer cet email.
                </p>
              </div>
            `,
          }),
        });

        if (!emailResponse.ok) {
          const errorText = await emailResponse.text();
          console.error('Resend error:', errorText);
        } else {
          console.log('Email sent successfully');
        }
      } catch (emailError) {
        console.error('Error sending email:', emailError);
        // Don't fail the request if email fails
      }
    } else {
      console.log('Resend not configured, skipping email');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          token: invitation.token,
          expiresAt: invitation.expires_at
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-team-invitation:', error);
    return new Response(
      JSON.stringify({ error: 'Erreur serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
