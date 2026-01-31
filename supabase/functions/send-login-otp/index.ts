import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface SendOtpRequest {
  device_id: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const resendFromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'noreply@lavcom.fr';

    if (!resendApiKey) {
      console.error('[send-login-otp] RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: SendOtpRequest = await req.json();
    
    if (!body.device_id) {
      return new Response(
        JSON.stringify({ error: 'Missing device_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const deviceId = body.device_id.slice(0, 64);
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Rate limiting: max 5 OTPs per hour per user
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await serviceClient
      .from('auth_login_otps')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', oneHourAgo);

    if (count && count >= 5) {
      console.warn(`[send-login-otp] Rate limit exceeded for user ${user.id}`);
      return new Response(
        JSON.stringify({ 
          error: 'Too many OTP requests. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED',
          retry_after: 3600,
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await hashString(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // Delete any existing OTPs for this user+device
    await serviceClient
      .from('auth_login_otps')
      .delete()
      .eq('user_id', user.id)
      .eq('device_id', deviceId);

    // Insert new OTP
    const { error: insertError } = await serviceClient.from('auth_login_otps').insert({
      user_id: user.id,
      device_id: deviceId,
      code_hash: otpHash,
      expires_at: expiresAt,
    });

    if (insertError) {
      console.error('[send-login-otp] Insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate OTP' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send email
    const resend = new Resend(resendApiKey);
    
    const { error: emailError } = await resend.emails.send({
      from: `Lavcom Performances <${resendFromEmail}>`,
      to: [user.email!],
      subject: 'Code de vérification - Nouvelle connexion',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; background-color: #f5f5f5;">
          <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
            <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 16px;">Vérification de sécurité</h1>
            <p style="color: #666; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
              Nous avons détecté une connexion depuis un nouvel appareil ou emplacement. Veuillez saisir ce code pour confirmer votre identité :
            </p>
            <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1a1a1a; font-family: monospace;">${otp}</span>
            </div>
            <p style="color: #999; font-size: 14px; margin-bottom: 0;">
              Ce code expire dans 10 minutes. Si vous n'avez pas initié cette connexion, ignorez ce message.
            </p>
          </div>
        </body>
        </html>
      `,
    });

    if (emailError) {
      console.error('[send-login-otp] Email error:', emailError);
      // Delete the OTP since email failed
      await serviceClient
        .from('auth_login_otps')
        .delete()
        .eq('user_id', user.id)
        .eq('device_id', deviceId);
      
      return new Response(
        JSON.stringify({ error: 'Failed to send verification email' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the event
    await serviceClient.rpc('rpc_log_system_event', {
      p_env: 'prod',
      p_source: 'login_otp',
      p_severity: 'info',
      p_code: 'LOGIN_OTP_SENT',
      p_message: 'Login OTP sent to user',
      p_meta: {
        user_id: user.id,
        user_email: user.email,
        device_id: deviceId,
      },
    });

    console.log(`[send-login-otp] OTP sent to ${user.email}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Verification code sent to your email',
        expires_in: 600, // 10 minutes in seconds
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[send-login-otp] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
