import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { validateInput, ValidationSchema } from "../_shared/validation.ts";
import { getServiceClient } from "../_shared/auth.ts";

// This endpoint is SERVICE ROLE ONLY - for internal logging
const EVENT_SCHEMA: ValidationSchema = {
  actor_id: { type: 'uuid', required: false },
  action: { type: 'string', required: true, minLength: 1, maxLength: 100 },
  target_table: { type: 'string', required: true, minLength: 1, maxLength: 100 },
  target_id: { type: 'uuid', required: false },
  metadata: { type: 'object', required: false },
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
    // Verify this is a service role request
    const authHeader = req.headers.get('Authorization');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!authHeader || !authHeader.includes(serviceKey!)) {
      console.log('[log-event] Unauthorized: not service role');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - service role required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate input
    const body = await req.json();
    const validation = validateInput(body, EVENT_SCHEMA);

    if (!validation.valid) {
      console.log('[log-event] Validation errors:', validation.errors);
      return new Response(
        JSON.stringify({ error: 'Validation failed', details: validation.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { actor_id, action, target_table, target_id, metadata } = validation.sanitized as {
      actor_id?: string;
      action: string;
      target_table: string;
      target_id?: string;
      metadata?: Record<string, unknown>;
    };

    // Get IP hash if provided
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                     req.headers.get('cf-connecting-ip') || 
                     null;
    
    let ipHash = null;
    if (clientIP) {
      const salt = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.slice(0, 16) || "rate_limit_salt";
      const data = new TextEncoder().encode(salt + clientIP);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      ipHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
    }

    // Write audit log
    const serviceClient = getServiceClient();
    
    const { data: logId, error: logError } = await serviceClient.rpc('rpc_create_audit_log', {
      p_actor_id: actor_id || null,
      p_action: action,
      p_target_table: target_table,
      p_target_id: target_id || null,
      p_metadata: metadata || {},
      p_ip_hash: ipHash,
      p_user_agent: req.headers.get('user-agent')?.slice(0, 500) || null,
    });

    if (logError) {
      console.error('[log-event] Insert error:', logError);
      return new Response(
        JSON.stringify({ error: 'Failed to log event' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[log-event] Event logged: ${action} on ${target_table}`);

    return new Response(
      JSON.stringify({ success: true, log_id: logId }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[log-event] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
