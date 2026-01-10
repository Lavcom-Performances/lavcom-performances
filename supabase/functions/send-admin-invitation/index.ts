import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AdminInvitationRequest {
  email: string;
  role: 'super_admin' | 'admin' | 'billing';
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  billing: 'Comptable',
};

const ROLE_PERMISSIONS_HTML: Record<string, string> = {
  super_admin: `
    <ul style="color: #666; font-size: 14px; margin: 10px 0;">
      <li>Accès à toutes les pages du back-office</li>
      <li>Gestion des rôles et permissions</li>
      <li>Gestion de tous les utilisateurs</li>
      <li>Visualisation et export de la facturation</li>
      <li>Invitation d'autres administrateurs</li>
    </ul>
  `,
  admin: `
    <ul style="color: #666; font-size: 14px; margin: 10px 0;">
      <li>Visualisation de tous les utilisateurs</li>
      <li>Visualisation de toutes les laveries</li>
      <li>Accès aux analytics</li>
      <li>Visualisation des ventes</li>
      <li>Export des données</li>
    </ul>
  `,
  billing: `
    <ul style="color: #666; font-size: 14px; margin: 10px 0;">
      <li>Visualisation des ventes</li>
      <li>Accès aux factures</li>
      <li>Export des données de facturation</li>
    </ul>
  `,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const resendFromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'noreply@lavcom.fr';

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is super_admin
    const { data: isSuperAdmin } = await supabaseAdmin.rpc('is_platform_super_admin', { uid: user.id });
    if (!isSuperAdmin) {
      return new Response(
        JSON.stringify({ error: 'Seuls les Super Admins peuvent inviter des administrateurs' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email, role }: AdminInvitationRequest = await req.json();
    console.log(`Admin invitation: ${email} as ${role}`);

    if (!email || !role) {
      return new Response(
        JSON.stringify({ error: 'Email et rôle requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get inviter profile
    const { data: inviterProfile } = await supabaseAdmin
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', user.id)
      .single();

    const inviterName = inviterProfile?.first_name && inviterProfile?.last_name
      ? `${inviterProfile.first_name} ${inviterProfile.last_name}`
      : inviterProfile?.email || 'Un administrateur';

    // Build login URL
    const siteUrl = Deno.env.get('SITE_URL') || 'https://lavcom-performances.lovable.app';
    const loginUrl = `${siteUrl}/login`;
    const adminUrl = `${siteUrl}/admin`;

    // Send email via Resend
    if (!resendApiKey) {
      console.log('Resend not configured, skipping email');
      return new Response(
        JSON.stringify({ success: true, emailSent: false }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
          subject: `Vous avez été ajouté(e) comme ${ROLE_LABELS[role]} sur Lavcom Performances`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 20px; border-radius: 12px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #3D4B7A; margin: 0;">Lavcom Performances</h1>
                <p style="color: #7DD3E8; font-size: 14px; margin: 5px 0;">Back-office Administration</p>
              </div>
              
              <div style="background: white; padding: 30px; border-radius: 8px; border: 1px solid #e5e7eb;">
                <h2 style="color: #3D4B7A; margin-top: 0;">Bienvenue dans l'équipe !</h2>
                
                <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                  <strong>${inviterName}</strong> vous a accordé l'accès au back-office de Lavcom Performances 
                  avec le rôle <strong style="color: #A3C615;">${ROLE_LABELS[role]}</strong>.
                </p>

                <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="color: #374151; margin: 0 0 10px 0; font-weight: 600;">Vos permissions :</p>
                  ${ROLE_PERMISSIONS_HTML[role] || ''}
                </div>

                <div style="background: #3D4B7A; padding: 20px; border-radius: 8px; margin: 25px 0;">
                  <h3 style="color: white; margin: 0 0 15px 0; font-size: 16px;">📋 Instructions de connexion</h3>
                  <ol style="color: #A8B4D0; font-size: 14px; margin: 0; padding-left: 20px; line-height: 1.8;">
                    <li>Connectez-vous sur <a href="${loginUrl}" style="color: #7DD3E8;">${loginUrl}</a></li>
                    <li>Utilisez votre adresse email : <strong style="color: white;">${email}</strong></li>
                    <li>Si vous n'avez pas encore de compte, créez-en un avec cette adresse</li>
                    <li>Une fois connecté(e), accédez au back-office via <a href="${adminUrl}" style="color: #7DD3E8;">Administration</a></li>
                  </ol>
                </div>

                <div style="text-align: center; margin-top: 30px;">
                  <a href="${loginUrl}" 
                     style="background: linear-gradient(to right, #A3C615, #8AAD12); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
                    Se connecter
                  </a>
                </div>
              </div>

              <div style="text-align: center; margin-top: 20px;">
                <p style="color: #9ca3af; font-size: 12px;">
                  Cet email a été envoyé automatiquement par Lavcom Performances.<br>
                  Si vous n'attendiez pas cet accès, veuillez contacter l'administrateur.
                </p>
              </div>
            </div>
          `,
        }),
      });

      if (!emailResponse.ok) {
        const errorText = await emailResponse.text();
        console.error('Resend error:', errorText);
        return new Response(
          JSON.stringify({ success: true, emailSent: false, error: 'Erreur envoi email' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Admin invitation email sent successfully');

      // Log the action in audit logs
      await supabaseAdmin
        .from('admin_audit_logs')
        .insert({
          admin_user_id: user.id,
          action: 'ADMIN_INVITATION_SENT',
          details: {
            target_email: email,
            role: role,
          }
        });

      return new Response(
        JSON.stringify({ success: true, emailSent: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (emailError) {
      console.error('Error sending email:', emailError);
      return new Response(
        JSON.stringify({ success: true, emailSent: false }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error in send-admin-invitation:', error);
    return new Response(
      JSON.stringify({ error: 'Erreur serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
