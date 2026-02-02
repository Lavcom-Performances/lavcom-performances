import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
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

    // Service client for privileged ops
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get current user
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request
    const body = await req.json();
    const { job_id } = body;

    if (!job_id) {
      return new Response(
        JSON.stringify({ error: 'job_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the job with service role
    const { data: job, error: fetchError } = await serviceClient
      .from('export_jobs')
      .select('*')
      .eq('id', job_id)
      .single();

    if (fetchError || !job) {
      return new Response(
        JSON.stringify({ error: 'Export job not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Authorization check
    let isAuthorized = false;

    if (job.role_scope === 'platform_admin') {
      // Check if user is platform admin
      const { data: platformRole } = await serviceClient
        .from('platform_roles')
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['admin', 'super_admin'])
        .limit(1);

      isAuthorized = !!(platformRole && platformRole.length > 0);
    } else {
      // SaaS user - check if they created the job
      isAuthorized = job.created_by === user.id;

      // Also verify company membership
      if (isAuthorized && job.company_id) {
        const { data: userRole } = await serviceClient
          .from('user_roles')
          .select('organization_id')
          .eq('user_id', user.id)
          .eq('organization_id', job.company_id)
          .limit(1);

        isAuthorized = !!(userRole && userRole.length > 0);
      }
    }

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check job status
    if (job.status !== 'success') {
      return new Response(
        JSON.stringify({ error: `Export is not ready. Status: ${job.status}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check expiration
    if (job.expires_at) {
      const expiresAt = new Date(job.expires_at);
      if (expiresAt < new Date()) {
        return new Response(
          JSON.stringify({ error: 'Export has expired' }),
          { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Check result path
    if (!job.result_path) {
      return new Response(
        JSON.stringify({ error: 'Export file not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate signed URL (15 minutes)
    const expiresIn = 900; // 15 minutes
    const { data: signedUrlData, error: signedUrlError } = await serviceClient.storage
      .from('exports')
      .createSignedUrl(job.result_path, expiresIn, {
        download: job.result_filename || 'export.csv'
      });

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error('Error creating signed URL:', signedUrlError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate download URL' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the download
    await serviceClient.rpc('rpc_log_system_event', {
      p_env: 'prod',
      p_source: 'export',
      p_severity: 'info',
      p_code: 'EXPORT_DOWNLOADED',
      p_message: `Export downloaded: ${job.export_type}`,
      p_meta: {
        job_id: job.id,
        export_type: job.export_type,
        role_scope: job.role_scope,
        actor_id: user.id,
        actor_email: user.email,
      }
    });

    console.log(`Download URL generated for job ${job_id} by user ${user.id}`);

    return new Response(
      JSON.stringify({
        url: signedUrlData.signedUrl,
        filename: job.result_filename,
        expires_in_seconds: expiresIn,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-export-download-url:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
