import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Verify the user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Service client for privileged operations
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user is super_admin
    const { data: roleData } = await serviceClient
      .from('platform_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'super_admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ 
        active: false,
        session: null,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get active session for this admin
    const now = new Date().toISOString();
    const { data: session } = await serviceClient
      .from('impersonation_sessions')
      .select('*')
      .eq('admin_id', user.id)
      .is('revoked_at', null)
      .gt('expires_at', now)
      .order('created_at', { ascending: false })
      .maybeSingle();

    if (!session) {
      return new Response(JSON.stringify({ 
        active: false,
        session: null,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get target user email
    const { data: targetProfile } = await serviceClient
      .from('profiles')
      .select('email, first_name, last_name, company_name')
      .eq('id', session.target_user_id)
      .maybeSingle();

    return new Response(JSON.stringify({
      active: true,
      session: {
        id: session.id,
        target_user_id: session.target_user_id,
        target_email: targetProfile?.email,
        target_name: [targetProfile?.first_name, targetProfile?.last_name].filter(Boolean).join(' ') || null,
        target_company: targetProfile?.company_name,
        reason: session.reason,
        ticket_id: session.ticket_id,
        created_at: session.created_at,
        expires_at: session.expires_at,
      },
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[get-impersonation-session] Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
