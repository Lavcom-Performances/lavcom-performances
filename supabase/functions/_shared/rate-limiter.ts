// Rate limit configurations
export const RATE_LIMITS = {
  // Auth endpoints
  'auth/login': { maxRequests: 8, windowSeconds: 600 },        // 8 per 10 min
  'auth/signup': { maxRequests: 5, windowSeconds: 3600 },      // 5 per hour
  'auth/resend': { maxRequests: 3, windowSeconds: 900 },       // 3 per 15 min
  'auth/reset': { maxRequests: 3, windowSeconds: 900 },        // 3 per 15 min
  
  // Edge Functions
  'edge/fetch-from-siret': { maxRequests: 10, windowSeconds: 300 },  // 10 per 5 min
  'edge/create-demo': { maxRequests: 1, windowSeconds: 86400 },      // 1 per 24h
  
  // Import/Export
  'import/csv-site': { maxRequests: 1, windowSeconds: 120 },    // 1 per 2 min per site
  'import/csv-user': { maxRequests: 10, windowSeconds: 3600 },  // 10 per hour per user
  'export/pdf': { maxRequests: 5, windowSeconds: 600 },         // 5 per 10 min
  'export/xlsx': { maxRequests: 5, windowSeconds: 600 },        // 5 per 10 min
} as const;

export type RateLimitScope = keyof typeof RATE_LIMITS;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number; // seconds until reset
  cooldownSeconds?: number;
}

// Hash IP address for privacy (SHA-256 with salt)
export async function hashIP(ip: string): Promise<string> {
  const salt = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.slice(0, 16) || "rate_limit_salt";
  const data = new TextEncoder().encode(salt + ip);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

// Mask email for logging (privacy)
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***';
  const maskedLocal = local.slice(0, 2) + '***';
  const [domainName, tld] = domain.split('.');
  const maskedDomain = domainName?.slice(0, 2) + '**' + (tld ? '.' + tld : '');
  return `${maskedLocal}@${maskedDomain}`;
}

// Check and update rate limit
export async function checkRateLimit(
  supabaseUrl: string,
  supabaseServiceKey: string,
  scope: RateLimitScope,
  identifier: string,
  ipHash?: string
): Promise<RateLimitResult> {
  const config = RATE_LIMITS[scope];
  const now = new Date();
  const windowStart = new Date(now.getTime() - config.windowSeconds * 1000);

  // Use fetch directly to avoid type issues with dynamic Supabase client
  const baseUrl = `${supabaseUrl}/rest/v1/rate_limits`;
  const headers = {
    'apikey': supabaseServiceKey,
    'Authorization': `Bearer ${supabaseServiceKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };

  try {
    // Get current count for this scope + identifier within window
    const selectUrl = `${baseUrl}?scope=eq.${encodeURIComponent(scope)}&identifier=eq.${encodeURIComponent(identifier)}&window_start=gte.${windowStart.toISOString()}&order=window_start.desc&limit=1`;
    const selectResponse = await fetch(selectUrl, { headers });
    
    if (!selectResponse.ok) {
      console.error('Rate limit check error:', await selectResponse.text());
      return { allowed: true, remaining: config.maxRequests, resetIn: config.windowSeconds };
    }

    const existing = await selectResponse.json();

    if (existing && existing.length > 0) {
      const record = existing[0];
      const currentCount = record.count;
      const windowStartTime = new Date(record.window_start).getTime();
      const resetIn = Math.ceil((windowStartTime + config.windowSeconds * 1000 - now.getTime()) / 1000);

      if (currentCount >= config.maxRequests) {
        console.log(`Rate limit exceeded: scope=${scope}, identifier=${maskEmail(identifier)}, count=${currentCount}`);
        return {
          allowed: false,
          remaining: 0,
          resetIn: Math.max(0, resetIn),
          cooldownSeconds: Math.max(0, resetIn)
        };
      }

      // Increment count
      const updateUrl = `${baseUrl}?id=eq.${record.id}`;
      await fetch(updateUrl, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ count: currentCount + 1 })
      });

      return {
        allowed: true,
        remaining: config.maxRequests - currentCount - 1,
        resetIn: Math.max(0, resetIn)
      };
    }

    // No record exists - create new one
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

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetIn: config.windowSeconds
    };
  } catch (error) {
    console.error('Rate limit error:', error);
    // Fail open
    return { allowed: true, remaining: config.maxRequests, resetIn: config.windowSeconds };
  }
}

// Format cooldown for display
export function formatCooldown(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (remainingSeconds === 0) {
    return `${minutes} min`;
  }
  return `${minutes} min ${remainingSeconds}s`;
}

// Standard 429 response with i18n-ready body
export function rateLimitResponse(
  cooldownSeconds: number,
  scope: string,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({
      error: 'rate_limit_exceeded',
      scope,
      cooldown_seconds: cooldownSeconds,
      cooldown_formatted: formatCooldown(cooldownSeconds),
      message_key: `rateLimit.${scope.replace('/', '_')}`,
      retry_after: cooldownSeconds
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': cooldownSeconds.toString()
      }
    }
  );
}
