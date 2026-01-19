/**
 * TAEX-210: AI Proxy Edge Function - Hardened
 * 
 * Security features:
 * - Strict model allowlist
 * - URL allowlist (only Lovable AI gateway)
 * - Per-user daily quotas (request count + cost)
 * - Burst rate limiting (per-actor + per-IP)
 * - Safe logging (no prompts, only metadata + trace_id)
 * - Trace IDs for error tracking
 */

import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { validateInput, ValidationSchema, redactSensitiveData } from "../_shared/validation.ts";
import { verifyAuth, getServiceClient } from "../_shared/auth.ts";
import { checkRateLimit, rateLimitResponse, hashIP, RATE_LIMITS } from "../_shared/rate-limiter.ts";

// ============================================================================
// CONFIGURATION CONSTANTS
// ============================================================================

// Strict model allowlist - ONLY these models are permitted
const ALLOWED_MODELS = [
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
] as const;

// ONLY allowed AI provider URL - no user-provided URLs accepted
const ALLOWED_AI_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

// Per-user daily limits
const DAILY_REQUEST_LIMIT = 200;
const DAILY_COST_LIMIT_EUR = 5.0;

// Burst rate limits (short window anti-abuse)
const BURST_LIMIT_ACTOR = { maxRequests: 30, windowSeconds: 300 };  // 30 per 5 min per user
const BURST_LIMIT_IP = { maxRequests: 60, windowSeconds: 300 };     // 60 per 5 min per IP

// Estimated cost per 1K tokens (rough average for quota enforcement)
const COST_PER_1K_TOKENS_IN = 0.0001;   // €0.0001 per 1K input tokens
const COST_PER_1K_TOKENS_OUT = 0.0003;  // €0.0003 per 1K output tokens

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const AI_REQUEST_SCHEMA: ValidationSchema = {
  model: { type: 'string', required: true, maxLength: 100 },
  messages: { type: 'array', required: true },
  temperature: { type: 'number', required: false, min: 0, max: 2 },
  max_tokens: { type: 'number', required: false, min: 1, max: 4096 },
  stream: { type: 'boolean', required: false },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Generate a unique trace ID for request tracking
function generateTraceId(): string {
  return crypto.randomUUID();
}

// Estimate token count from text (rough approximation: 1 token ≈ 4 chars)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Calculate estimated cost in EUR
function calculateEstimatedCost(tokensIn: number, tokensOut: number): number {
  return (tokensIn / 1000) * COST_PER_1K_TOKENS_IN + 
         (tokensOut / 1000) * COST_PER_1K_TOKENS_OUT;
}

// Burst rate limit check (uses rate_limits table)
async function checkBurstRateLimit(
  supabaseUrl: string,
  supabaseServiceKey: string,
  scope: string,
  identifier: string,
  maxRequests: number,
  windowSeconds: number,
  ipHash?: string
): Promise<{ allowed: boolean; cooldownSeconds?: number }> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowSeconds * 1000);

  const baseUrl = `${supabaseUrl}/rest/v1/rate_limits`;
  const headers = {
    'apikey': supabaseServiceKey,
    'Authorization': `Bearer ${supabaseServiceKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };

  try {
    // Check existing count in window
    const selectUrl = `${baseUrl}?scope=eq.${encodeURIComponent(scope)}&identifier=eq.${encodeURIComponent(identifier)}&window_start=gte.${windowStart.toISOString()}&order=window_start.desc&limit=1`;
    const selectResponse = await fetch(selectUrl, { headers });
    
    if (!selectResponse.ok) {
      console.error('[ai-proxy] Burst rate limit check error');
      return { allowed: true }; // Fail open
    }

    const existing = await selectResponse.json();

    if (existing && existing.length > 0) {
      const record = existing[0];
      const currentCount = record.count;
      const windowStartTime = new Date(record.window_start).getTime();
      const resetIn = Math.ceil((windowStartTime + windowSeconds * 1000 - now.getTime()) / 1000);

      if (currentCount >= maxRequests) {
        return { allowed: false, cooldownSeconds: Math.max(0, resetIn) };
      }

      // Increment
      await fetch(`${baseUrl}?id=eq.${record.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ count: currentCount + 1 })
      });

      return { allowed: true };
    }

    // Create new record
    await fetch(baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        scope,
        identifier,
        ip_hash: ipHash || null,
        window_start: now.toISOString(),
        count: 1
      })
    });

    return { allowed: true };
  } catch (error) {
    console.error('[ai-proxy] Burst rate limit error:', error);
    return { allowed: true }; // Fail open
  }
}

// Log metadata to system_events (safe logging - no prompts)
async function logAIRequest(
  supabaseUrl: string,
  supabaseServiceKey: string,
  traceId: string,
  actorId: string,
  model: string,
  messageCount: number,
  tokensIn: number,
  tokensOut: number,
  latencyMs: number,
  statusCode: number,
  errorCode?: string
) {
  try {
    const baseUrl = `${supabaseUrl}/rest/v1/rpc/rpc_log_system_event`;
    const headers = {
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'Content-Type': 'application/json',
    };

    await fetch(baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        p_source: 'ai_proxy',
        p_severity: statusCode >= 400 ? 'warn' : 'info',
        p_message: `AI request ${statusCode >= 400 ? 'failed' : 'completed'}`,
        p_code: errorCode || null,
        p_env: 'prod',
        p_meta: {
          trace_id: traceId,
          actor_id: actorId,
          model,
          message_count: messageCount,
          tokens_in: tokensIn,
          tokens_out: tokensOut,
          latency_ms: latencyMs,
          status_code: statusCode,
          // NEVER log prompt content, API responses, or raw headers
        }
      })
    });
  } catch (error) {
    // Don't fail request if logging fails
    console.error('[ai-proxy] Failed to log event:', error);
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

Deno.serve(async (req) => {
  const startTime = Date.now();
  const traceId = generateTraceId();

  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed', trace_id: traceId }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Get client IP for rate limiting
  const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                   req.headers.get('cf-connecting-ip') || 
                   'unknown';
  const ipHash = await hashIP(clientIP);

  try {
    // ========================================================================
    // AUTHENTICATION
    // ========================================================================
    const { user, error: authError } = await verifyAuth(req);
    if (authError || !user) {
      await logAIRequest(supabaseUrl, supabaseServiceKey, traceId, 'anonymous', 'unknown', 0, 0, 0, Date.now() - startTime, 401, 'auth_error');
      return new Response(
        JSON.stringify({ error: authError || 'Unauthorized', trace_id: traceId }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const actorId = user.id;

    // ========================================================================
    // BURST RATE LIMITING (Anti-abuse)
    // ========================================================================
    
    // Per-actor burst limit
    const actorBurstResult = await checkBurstRateLimit(
      supabaseUrl,
      supabaseServiceKey,
      'ai_proxy/burst_actor',
      actorId,
      BURST_LIMIT_ACTOR.maxRequests,
      BURST_LIMIT_ACTOR.windowSeconds,
      ipHash
    );

    if (!actorBurstResult.allowed) {
      await logAIRequest(supabaseUrl, supabaseServiceKey, traceId, actorId, 'unknown', 0, 0, 0, Date.now() - startTime, 429, 'burst_limit_actor');
      return new Response(
        JSON.stringify({
          error: 'Too many requests. Please slow down.',
          trace_id: traceId,
          cooldown_seconds: actorBurstResult.cooldownSeconds,
          retry_after: actorBurstResult.cooldownSeconds
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': String(actorBurstResult.cooldownSeconds || 60)
          } 
        }
      );
    }

    // Per-IP burst limit
    const ipBurstResult = await checkBurstRateLimit(
      supabaseUrl,
      supabaseServiceKey,
      'ai_proxy/burst_ip',
      ipHash,
      BURST_LIMIT_IP.maxRequests,
      BURST_LIMIT_IP.windowSeconds,
      ipHash
    );

    if (!ipBurstResult.allowed) {
      await logAIRequest(supabaseUrl, supabaseServiceKey, traceId, actorId, 'unknown', 0, 0, 0, Date.now() - startTime, 429, 'burst_limit_ip');
      return new Response(
        JSON.stringify({
          error: 'Too many requests from this network. Please slow down.',
          trace_id: traceId,
          cooldown_seconds: ipBurstResult.cooldownSeconds,
          retry_after: ipBurstResult.cooldownSeconds
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': String(ipBurstResult.cooldownSeconds || 60)
          } 
        }
      );
    }

    // ========================================================================
    // INPUT VALIDATION
    // ========================================================================
    const body = await req.json();
    const validation = validateInput(body, AI_REQUEST_SCHEMA);

    if (!validation.valid) {
      await logAIRequest(supabaseUrl, supabaseServiceKey, traceId, actorId, 'unknown', 0, 0, 0, Date.now() - startTime, 400, 'validation_error');
      return new Response(
        JSON.stringify({ 
          error: 'Validation failed', 
          details: validation.errors,
          trace_id: traceId 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { model, messages, temperature, max_tokens, stream } = validation.sanitized as {
      model: string;
      messages: Array<{ role: string; content: string }>;
      temperature?: number;
      max_tokens?: number;
      stream?: boolean;
    };

    // ========================================================================
    // MODEL ALLOWLIST (Strict)
    // ========================================================================
    if (!ALLOWED_MODELS.includes(model as typeof ALLOWED_MODELS[number])) {
      await logAIRequest(supabaseUrl, supabaseServiceKey, traceId, actorId, model, messages.length, 0, 0, Date.now() - startTime, 400, 'model_not_allowed');
      return new Response(
        JSON.stringify({ 
          error: 'Model not allowed',
          message: `The model "${model}" is not in the allowlist. Please use one of the supported models.`,
          allowed_models: [...ALLOWED_MODELS],
          trace_id: traceId
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================================================
    // BLOCK URL OVERRIDES (Security)
    // ========================================================================
    // Users cannot override the AI endpoint - we ONLY use ALLOWED_AI_GATEWAY_URL
    // This prevents open proxy attacks

    // ========================================================================
    // PER-USER DAILY QUOTA CHECK
    // ========================================================================
    
    // Estimate input tokens
    const inputText = messages.map(m => m.content || '').join(' ');
    const estimatedTokensIn = estimateTokens(inputText);
    const estimatedTokensOut = max_tokens || 1024; // Use max_tokens as estimate
    const estimatedCost = calculateEstimatedCost(estimatedTokensIn, estimatedTokensOut);

    // Check and increment quota atomically
    const quotaCheckUrl = `${supabaseUrl}/rest/v1/rpc/rpc_increment_ai_usage`;
    const quotaResponse = await fetch(quotaCheckUrl, {
      method: 'POST',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_actor_id: actorId,
        p_tokens_in: estimatedTokensIn,
        p_tokens_out: 0, // Will update after response
        p_estimated_cost: estimatedCost,
        p_daily_request_limit: DAILY_REQUEST_LIMIT,
        p_daily_cost_limit: DAILY_COST_LIMIT_EUR
      })
    });

    if (!quotaResponse.ok) {
      console.error('[ai-proxy] Quota check failed:', await quotaResponse.text());
      // Fail open but log
      await logAIRequest(supabaseUrl, supabaseServiceKey, traceId, actorId, model, messages.length, estimatedTokensIn, 0, Date.now() - startTime, 500, 'quota_check_failed');
    } else {
      const quotaResult = await quotaResponse.json();
      
      if (!quotaResult.allowed) {
        const reason = quotaResult.reason === 'daily_request_limit_exceeded' 
          ? 'Daily AI request limit reached. Try again tomorrow.'
          : 'Daily AI cost limit reached. Try again tomorrow.';
        
        await logAIRequest(supabaseUrl, supabaseServiceKey, traceId, actorId, model, messages.length, estimatedTokensIn, 0, Date.now() - startTime, 429, quotaResult.reason);
        
        return new Response(
          JSON.stringify({
            error: reason,
            trace_id: traceId,
            current_count: quotaResult.current_count,
            limit: DAILY_REQUEST_LIMIT,
            retry_after_message: 'Try again tomorrow after midnight UTC.'
          }),
          { 
            status: 429, 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json'
            } 
          }
        );
      }
    }

    // ========================================================================
    // CALL AI PROVIDER (Only allowed gateway)
    // ========================================================================
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    if (!lovableApiKey) {
      await logAIRequest(supabaseUrl, supabaseServiceKey, traceId, actorId, model, messages.length, estimatedTokensIn, 0, Date.now() - startTime, 503, 'api_key_missing');
      return new Response(
        JSON.stringify({ 
          error: 'AI service not configured',
          trace_id: traceId
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call the ONLY allowed endpoint (no user-provided URLs)
    const aiResponse = await fetch(ALLOWED_AI_GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content // Content is validated, not logged
        })),
        temperature: temperature ?? 0.7,
        max_tokens: max_tokens ?? 1024,
        stream: stream ?? false,
      }),
    });

    const latencyMs = Date.now() - startTime;

    // Handle AI provider errors
    if (!aiResponse.ok) {
      const statusCode = aiResponse.status;
      let errorCode = 'ai_provider_error';
      let userMessage = 'AI request failed.';

      if (statusCode === 429) {
        errorCode = 'ai_rate_limited';
        userMessage = 'AI service rate limited. Please try again later.';
      } else if (statusCode === 402) {
        errorCode = 'ai_credits_exhausted';
        userMessage = 'AI service credits exhausted.';
      }

      await logAIRequest(supabaseUrl, supabaseServiceKey, traceId, actorId, model, messages.length, estimatedTokensIn, 0, latencyMs, statusCode, errorCode);

      return new Response(
        JSON.stringify({ 
          error: userMessage,
          trace_id: traceId
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle streaming response
    if (stream) {
      await logAIRequest(supabaseUrl, supabaseServiceKey, traceId, actorId, model, messages.length, estimatedTokensIn, 0, latencyMs, 200);
      
      return new Response(aiResponse.body, {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'text/event-stream',
          'X-Trace-Id': traceId
        }
      });
    }

    // Parse non-streaming response
    const aiResult = await aiResponse.json();
    
    // Calculate actual tokens from response
    const actualTokensOut = aiResult.usage?.completion_tokens || estimatedTokensOut;
    const actualTokensIn = aiResult.usage?.prompt_tokens || estimatedTokensIn;

    // Log successful request (metadata only - NO prompt content)
    await logAIRequest(
      supabaseUrl,
      supabaseServiceKey,
      traceId,
      actorId,
      model,
      messages.length,
      actualTokensIn,
      actualTokensOut,
      latencyMs,
      200
    );

    return new Response(
      JSON.stringify({ 
        ...aiResult,
        trace_id: traceId
      }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-Trace-Id': traceId
        } 
      }
    );

  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Log error (without sensitive data)
    await logAIRequest(supabaseUrl, supabaseServiceKey, traceId, 'unknown', 'unknown', 0, 0, 0, latencyMs, 500, 'internal_error');
    
    console.error('[ai-proxy] Internal error:', errorMessage);
    
    return new Response(
      JSON.stringify({ 
        error: 'AI request failed. Reference: ' + traceId,
        trace_id: traceId
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
