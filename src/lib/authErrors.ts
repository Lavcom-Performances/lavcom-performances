/**
 * Authentication error handling utilities
 * Maps Supabase auth errors to user-friendly i18n messages
 */

import { AuthError } from '@supabase/supabase-js';

export interface ParsedAuthError {
  key: string;
  isLeakedPassword: boolean;
  isWeakPassword: boolean;
  reasons?: string[];
}

/**
 * Detect if the error is related to a leaked/pwned password
 * Supabase returns errors like:
 * - "Password has appeared in a data breach"
 * - "Password is known to be weak or compromised"
 * - weak_password.reasons includes "pwned"
 */
export function parseAuthError(error: AuthError | Error | string): ParsedAuthError {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const errorLower = errorMessage.toLowerCase();
  
  // Check for leaked/pwned password indicators
  const leakedIndicators = [
    'breach',
    'pwned',
    'leaked',
    'compromised',
    'exposed',
    'hibp',
    'haveibeenpwned'
  ];
  
  const isLeakedPassword = leakedIndicators.some(indicator => 
    errorLower.includes(indicator)
  );
  
  // Check for weak password indicators
  const weakIndicators = [
    'weak_password',
    'weak password',
    'too weak',
    'password should contain',
    'password must contain'
  ];
  
  const isWeakPassword = weakIndicators.some(indicator => 
    errorLower.includes(indicator)
  );
  
  // Parse reasons if available (Supabase returns weak_password.reasons array)
  let reasons: string[] = [];
  try {
    // Try to extract reasons from JSON-like error structure
    const reasonsMatch = errorMessage.match(/"reasons":\s*\[([^\]]+)\]/);
    if (reasonsMatch) {
      reasons = reasonsMatch[1].split(',').map(r => r.trim().replace(/"/g, ''));
    }
  } catch {
    // Ignore parsing errors
  }
  
  // Determine the appropriate i18n key
  let key = 'common:error';
  
  if (isLeakedPassword || reasons.includes('pwned')) {
    key = 'errors:auth.leakedPassword';
  } else if (isWeakPassword) {
    key = 'errors:auth.weakPassword';
  } else if (errorLower.includes('already registered') || errorLower.includes('already exists')) {
    key = 'app:signup.alreadyRegistered';
  } else if (errorLower.includes('invalid credentials') || errorLower.includes('invalid email or password')) {
    key = 'app:login.invalidCredentials';
  } else if (errorLower.includes('email not confirmed')) {
    key = 'app:login.confirmEmail';
  }
  
  return {
    key,
    isLeakedPassword: isLeakedPassword || reasons.includes('pwned'),
    isWeakPassword,
    reasons
  };
}

/**
 * Check if an error message indicates a leaked password
 */
export function isLeakedPasswordError(error: AuthError | Error | string): boolean {
  return parseAuthError(error).isLeakedPassword;
}

/**
 * Get user-friendly error message for auth errors
 */
export function getAuthErrorMessage(
  error: AuthError | Error | string,
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  const parsed = parseAuthError(error);
  
  // Use the parsed key, falling back to the raw error message
  try {
    const translated = t(parsed.key);
    // If translation returns the key itself, fall back to error message
    if (translated === parsed.key || !translated) {
      return typeof error === 'string' ? error : error.message;
    }
    return translated;
  } catch {
    return typeof error === 'string' ? error : error.message;
  }
}
