import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface CloseLaundromatRequest {
  laundromat_id: string;
  reason?: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Authenticate user
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

    // User client for auth
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Service client for privileged operations
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub as string;

    // Parse request body
    const body: CloseLaundromatRequest = await req.json();
    const { laundromat_id, reason } = body;

    if (!laundromat_id) {
      return new Response(
        JSON.stringify({ error: 'laundromat_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the laundromat to verify ownership and get company_id
    const { data: site, error: siteError } = await serviceClient
      .from('sites')
      .select('id, user_id, organization_id, status, name')
      .eq('id', laundromat_id)
      .single();

    if (siteError || !site) {
      return new Response(
        JSON.stringify({ error: 'Laundromat not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is owner or has admin role in organization
    let hasPermission = false;
    let actorRole = 'unknown';

    // Check if user is the direct owner
    if (site.user_id === userId) {
      hasPermission = true;
      actorRole = 'owner';
    }

    // If not owner, check organization membership
    if (!hasPermission && site.organization_id) {
      const { data: userRole } = await serviceClient
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('organization_id', site.organization_id)
        .in('role', ['super_admin', 'company_admin', 'admin'])
        .maybeSingle();

      if (userRole) {
        hasPermission = true;
        actorRole = userRole.role;
      }
    }

    if (!hasPermission) {
      return new Response(
        JSON.stringify({ error: 'Only owners and admins can close a laundromat' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Idempotency: if already closed, return success
    if (site.status === 'closed') {
      return new Response(
        JSON.stringify({ success: true, message: 'Laundromat is already closed' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update laundromat status
    const { error: updateError } = await serviceClient
      .from('sites')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
        closed_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', laundromat_id);

    if (updateError) {
      console.error('Error closing laundromat:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to close laundromat' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log to system_events
    await serviceClient.from('system_events').insert({
      source: 'close-laundromat',
      severity: 'info',
      code: 'laundromat_closed',
      message: `Laundromat "${site.name}" was closed`,
      meta: {
        laundromat_id,
        laundromat_name: site.name,
        company_id: site.organization_id,
        actor_user_id: userId,
        actor_role: actorRole,
        reason: reason || null,
        timestamp: new Date().toISOString(),
      },
      env: 'prod',
    });

    console.log(`Laundromat ${laundromat_id} closed by user ${userId}`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in close-laundromat:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
