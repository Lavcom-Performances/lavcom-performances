/**
 * TAEX-210: AI Error Handling Utilities
 * 
 * Provides consistent error handling for AI proxy responses,
 * including trace ID display and user-friendly messages.
 */

export interface AIErrorResponse {
  error: string;
  trace_id?: string;
  cooldown_seconds?: number;
  retry_after?: number;
  current_count?: number;
  limit?: number;
  retry_after_message?: string;
}

export interface ParsedAIError {
  message: string;
  traceId?: string;
  isRateLimited: boolean;
  isQuotaExceeded: boolean;
  cooldownSeconds?: number;
  canRetry: boolean;
}

/**
 * Parse an AI proxy error response into a user-friendly format
 */
export function parseAIError(error: unknown): ParsedAIError {
  // Default error
  const defaultError: ParsedAIError = {
    message: 'An unexpected error occurred. Please try again.',
    isRateLimited: false,
    isQuotaExceeded: false,
    canRetry: true,
  };

  if (!error) return defaultError;

  // Handle Error objects
  if (error instanceof Error) {
    return {
      ...defaultError,
      message: error.message,
    };
  }

  // Handle AI proxy error responses
  if (typeof error === 'object' && error !== null) {
    const errorObj = error as AIErrorResponse;
    
    // Detect rate limiting
    if (errorObj.cooldown_seconds !== undefined || errorObj.retry_after !== undefined) {
      const cooldown = errorObj.cooldown_seconds || errorObj.retry_after;
      return {
        message: errorObj.error || 'Too many requests. Please slow down.',
        traceId: errorObj.trace_id,
        isRateLimited: true,
        isQuotaExceeded: false,
        cooldownSeconds: cooldown,
        canRetry: true,
      };
    }

    // Detect quota exceeded
    if (errorObj.current_count !== undefined || errorObj.retry_after_message) {
      return {
        message: errorObj.error || 'Daily AI limit reached. Try again tomorrow.',
        traceId: errorObj.trace_id,
        isRateLimited: false,
        isQuotaExceeded: true,
        canRetry: false,
      };
    }

    // Generic error with trace ID
    return {
      message: errorObj.error || defaultError.message,
      traceId: errorObj.trace_id,
      isRateLimited: false,
      isQuotaExceeded: false,
      canRetry: true,
    };
  }

  // Handle string errors
  if (typeof error === 'string') {
    return {
      ...defaultError,
      message: error,
    };
  }

  return defaultError;
}

/**
 * Format an AI error for display to the user
 */
export function formatAIErrorMessage(error: ParsedAIError, language: 'fr' | 'en' = 'fr'): string {
  const messages = {
    fr: {
      rateLimited: 'Trop de requêtes. Veuillez patienter quelques instants.',
      quotaExceeded: 'Limite quotidienne atteinte. Réessayez demain.',
      reference: 'Référence',
      cooldown: 'Réessayez dans',
      seconds: 'secondes',
    },
    en: {
      rateLimited: 'Too many requests. Please wait a moment.',
      quotaExceeded: 'Daily limit reached. Try again tomorrow.',
      reference: 'Reference',
      cooldown: 'Try again in',
      seconds: 'seconds',
    },
  };

  const t = messages[language];
  let message = error.message;

  if (error.isRateLimited && error.cooldownSeconds) {
    message = `${t.rateLimited} ${t.cooldown} ${error.cooldownSeconds} ${t.seconds}.`;
  } else if (error.isQuotaExceeded) {
    message = t.quotaExceeded;
  }

  if (error.traceId) {
    message += ` (${t.reference}: ${error.traceId.slice(0, 8)}...)`;
  }

  return message;
}

/**
 * Create a toast configuration for AI errors
 */
export function createAIErrorToast(error: ParsedAIError, language: 'fr' | 'en' = 'fr') {
  return {
    title: language === 'fr' ? 'Erreur AI' : 'AI Error',
    description: formatAIErrorMessage(error, language),
    variant: 'destructive' as const,
  };
}
