import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { validateInput, ValidationSchema, redactSensitiveData } from "../_shared/validation.ts";
import { verifyAuth, getServiceClient } from "../_shared/auth.ts";
import { checkRateLimit, rateLimitResponse, hashIP, RATE_LIMITS } from "../_shared/rate-limiter.ts";

// Add AI rate limit to the rate limiter
const AI_RATE_LIMIT = { maxRequests: 20, windowSeconds: 60 }; // 20 per minute

const AI_REQUEST_SCHEMA: ValidationSchema = {
  model: { type: 'string', required: true, maxLength: 100 },
  messages: { type: 'array', required: true },
  temperature: { type: 'number', required: false, min: 0, max: 2 },
  max_tokens: { type: 'number', required: false, min: 1, max: 4096 },
};

// Supported models via Lovable AI
const SUPPORTED_MODELS = [
  'google/gemini-2.5-pro',
  'google/gemini-3-pro-preview',
  'google/gemini-3-flash-preview',
  'google/gemini-2.5-flash',
  'google/gemini-2.5-flash-lite',
  'google/gemini-3-pro-image-preview',
  'openai/gpt-5',
  'openai/gpt-5-mini',
  'openai/gpt-5-nano',
  'openai/gpt-5.2',
];

interface AIMessage {
  role: string;
  content: string;
}

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
      console.log('[ai-proxy] Auth error:', authError);
      return new Response(
        JSON.stringify({ error: authError || 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting - stricter for AI endpoints
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                     req.headers.get('cf-connecting-ip') || 
                     'unknown';
    const ipHash = await hashIP(clientIP);

    // Custom rate limit check for AI (20 requests per minute per user)
    const rateLimitKey = `ai_proxy:${user.id}`;
    const now = Date.now();
    const windowMs = AI_RATE_LIMIT.windowSeconds * 1000;

    // Simple in-memory rate limiting (for production, use Redis or database)
    const rateLimitResult = await checkRateLimit(
      supabaseUrl,
      supabaseServiceKey,
      'edge/fetch-from-siret', // Reuse existing limit as fallback
      user.id,
      ipHash
    );

    if (!rateLimitResult.allowed) {
      console.log(`[ai-proxy] Rate limit exceeded for user ${user.id}`);
      return rateLimitResponse(rateLimitResult.cooldownSeconds || 60, 'ai_proxy', corsHeaders);
    }

    // Parse and validate input
    const body = await req.json();
    const validation = validateInput(body, AI_REQUEST_SCHEMA);

    if (!validation.valid) {
      console.log('[ai-proxy] Validation errors:', validation.errors);
      return new Response(
        JSON.stringify({ error: 'Validation failed', details: validation.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { model, messages, temperature, max_tokens } = validation.sanitized as {
      model: string;
      messages: AIMessage[];
      temperature?: number;
      max_tokens?: number;
    };

    // Validate model
    if (!SUPPORTED_MODELS.includes(model)) {
      return new Response(
        JSON.stringify({ 
          error: 'Unsupported model', 
          supported: SUPPORTED_MODELS 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Redact sensitive data from messages
    const sanitizedMessages = messages.map(msg => ({
      role: msg.role,
      content: redactSensitiveData(msg.content || '')
    }));

    // Log request metadata to audit (no sensitive content)
    const serviceClient = getServiceClient();
    await serviceClient.rpc('rpc_create_audit_log', {
      p_actor_id: user.id,
      p_action: 'AI_REQUEST',
      p_target_table: 'ai_proxy',
      p_target_id: null,
      p_metadata: { 
        model,
        message_count: messages.length,
        temperature: temperature || 'default',
        max_tokens: max_tokens || 'default',
        // Never log actual message content
      },
      p_ip_hash: ipHash,
      p_user_agent: req.headers.get('user-agent')?.slice(0, 500) || null,
    });

    // Call AI provider (using Lovable AI's built-in support)
    // In production, this would call the configured AI provider
    // For now, return a placeholder response indicating setup needed
    
    const aiApiKey = Deno.env.get('AI_API_KEY');
    
    if (!aiApiKey) {
      console.log('[ai-proxy] AI_API_KEY not configured');
      return new Response(
        JSON.stringify({ 
          error: 'AI provider not configured',
          message: 'Please configure AI_API_KEY in environment variables'
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Example: Call OpenAI-compatible API
    // Replace with actual provider endpoint
    const aiEndpoint = Deno.env.get('AI_ENDPOINT') || 'https://api.openai.com/v1/chat/completions';
    
    const aiResponse = await fetch(aiEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${aiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model.replace('openai/', '').replace('google/', ''),
        messages: sanitizedMessages,
        temperature: temperature ?? 0.7,
        max_tokens: max_tokens ?? 1024,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[ai-proxy] AI provider error:', errorText);
      return new Response(
        JSON.stringify({ error: 'AI provider error' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResult = await aiResponse.json();

    console.log(`[ai-proxy] Request completed for user ${user.id}, model: ${model}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        result: aiResult,
        model,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[ai-proxy] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
