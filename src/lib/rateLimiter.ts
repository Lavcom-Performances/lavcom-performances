// Client-side rate limiting utilities
// Complements server-side rate limiting for better UX

// Rate limit configurations (mirror of server config)
export const RATE_LIMITS = {
  'auth/login': { maxRequests: 8, windowSeconds: 600 },
  'auth/signup': { maxRequests: 5, windowSeconds: 3600 },
  'auth/resend': { maxRequests: 3, windowSeconds: 900 },
  'auth/reset': { maxRequests: 3, windowSeconds: 900 },
  'import/csv-site': { maxRequests: 1, windowSeconds: 120 },
  'import/csv-user': { maxRequests: 10, windowSeconds: 3600 },
  'export/pdf': { maxRequests: 5, windowSeconds: 600 },
  'export/xlsx': { maxRequests: 5, windowSeconds: 600 },
} as const;

export type RateLimitScope = keyof typeof RATE_LIMITS;

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const STORAGE_PREFIX = 'rate_limit_';

// Get current rate limit state from localStorage
function getRateLimitState(scope: RateLimitScope, identifier: string): RateLimitEntry | null {
  const key = `${STORAGE_PREFIX}${scope}_${identifier}`;
  const stored = localStorage.getItem(key);
  if (!stored) return null;
  
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

// Save rate limit state to localStorage
function setRateLimitState(scope: RateLimitScope, identifier: string, entry: RateLimitEntry): void {
  const key = `${STORAGE_PREFIX}${scope}_${identifier}`;
  localStorage.setItem(key, JSON.stringify(entry));
}

// Clear rate limit state
export function clearRateLimitState(scope: RateLimitScope, identifier: string): void {
  const key = `${STORAGE_PREFIX}${scope}_${identifier}`;
  localStorage.removeItem(key);
}

// Check if rate limited (client-side)
export function checkClientRateLimit(
  scope: RateLimitScope,
  identifier: string
): { allowed: boolean; remaining: number; cooldownSeconds: number } {
  const config = RATE_LIMITS[scope];
  const now = Date.now();
  const existing = getRateLimitState(scope, identifier);

  if (existing) {
    const windowEnd = existing.windowStart + config.windowSeconds * 1000;
    
    if (now < windowEnd) {
      // Still within window
      if (existing.count >= config.maxRequests) {
        const cooldownSeconds = Math.ceil((windowEnd - now) / 1000);
        return { allowed: false, remaining: 0, cooldownSeconds };
      }
      return {
        allowed: true,
        remaining: config.maxRequests - existing.count,
        cooldownSeconds: 0
      };
    }
    
    // Window expired, clear and allow
    clearRateLimitState(scope, identifier);
  }

  return { allowed: true, remaining: config.maxRequests, cooldownSeconds: 0 };
}

// Record a request (client-side)
export function recordClientRequest(scope: RateLimitScope, identifier: string): void {
  const config = RATE_LIMITS[scope];
  const now = Date.now();
  const existing = getRateLimitState(scope, identifier);

  if (existing) {
    const windowEnd = existing.windowStart + config.windowSeconds * 1000;
    
    if (now < windowEnd) {
      // Still within window, increment
      setRateLimitState(scope, identifier, {
        count: existing.count + 1,
        windowStart: existing.windowStart
      });
      return;
    }
  }

  // New window
  setRateLimitState(scope, identifier, {
    count: 1,
    windowStart: now
  });
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

// Get cooldown remaining for a scope
export function getCooldownRemaining(scope: RateLimitScope, identifier: string): number {
  const config = RATE_LIMITS[scope];
  const existing = getRateLimitState(scope, identifier);
  
  if (!existing) return 0;
  
  const now = Date.now();
  const windowEnd = existing.windowStart + config.windowSeconds * 1000;
  
  if (now >= windowEnd) {
    clearRateLimitState(scope, identifier);
    return 0;
  }
  
  if (existing.count >= config.maxRequests) {
    return Math.ceil((windowEnd - now) / 1000);
  }
  
  return 0;
}

// File size validation for CSV imports
export const CSV_MAX_SIZE_MB = 20;
export const CSV_MAX_SIZE_BYTES = CSV_MAX_SIZE_MB * 1024 * 1024;
export const CSV_MAX_LINES = 100000;

export function validateCSVFile(file: File): { valid: boolean; error?: string } {
  // Check file extension
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension !== 'csv') {
    return { valid: false, error: 'fileTypeError' };
  }

  // Check file size
  if (file.size > CSV_MAX_SIZE_BYTES) {
    return { valid: false, error: 'fileSizeError' };
  }

  return { valid: true };
}

// Estimate line count from file size (rough estimate)
export function estimateLineCount(fileSize: number): number {
  // Assume average line is ~100 bytes
  return Math.ceil(fileSize / 100);
}
