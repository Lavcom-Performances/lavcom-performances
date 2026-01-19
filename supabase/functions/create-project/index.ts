import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { validateInput, ValidationSchema } from "../_shared/validation.ts";
import { verifyAuth, getServiceClient } from "../_shared/auth.ts";
import { checkRateLimit, rateLimitResponse, hashIP } from "../_shared/rate-limiter.ts";

const PROJECT_SCHEMA: ValidationSchema = {
  name: { type: 'string', required: true, minLength: 1, maxLength: 100 },
  description: { type: 'string', required: false, maxLength: 1000 },
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Verify authentication
    const { user, error: authError } = await verifyAuth(req);
    if (authError || !user) {
      console.log('[create-project] Auth error:', authError);
      return new Response(
        JSON.stringify({ error: authError || 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                     req.headers.get('cf-connecting-ip') || 
                     'unknown';
    const ipHash = await hashIP(clientIP);

    // Rate limit: 10 project creations per hour per user
    const rateLimitResult = await checkRateLimit(
      supabaseUrl,
      supabaseServiceKey,
      'import/csv-user', // Reuse existing limit category
      user.id,
      ipHash
    );

    if (!rateLimitResult.allowed) {
      console.log(`[create-project] Rate limit exceeded for user ${user.id}`);
      return rateLimitResponse(rateLimitResult.cooldownSeconds || 0, 'create_project', corsHeaders);
    }

    // Parse and validate input
    const body = await req.json();
    const validation = validateInput(body, PROJECT_SCHEMA);

    if (!validation.valid) {
      console.log('[create-project] Validation errors:', validation.errors);
      return new Response(
        JSON.stringify({ error: 'Validation failed', details: validation.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { name, description } = validation.sanitized as { name: string; description?: string };

    // Create project using service role
    const serviceClient = getServiceClient();

    const { data: project, error: insertError } = await serviceClient
      .from('projects')
      .insert({
        owner_id: user.id,
        name,
        description: description || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[create-project] Insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create project' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Write audit log
    await serviceClient.rpc('rpc_create_audit_log', {
      p_actor_id: user.id,
      p_action: 'CREATE',
      p_target_table: 'projects',
      p_target_id: project.id,
      p_metadata: { 
        project_name: name,
        has_description: !!description 
      },
      p_ip_hash: ipHash,
      p_user_agent: req.headers.get('user-agent')?.slice(0, 500) || null,
    });

    console.log(`[create-project] Project created: ${project.id} by user ${user.id}`);

    return new Response(
      JSON.stringify({ success: true, project }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[create-project] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
