/**
 * Auth security logging utilities
 * Logs authentication-related events to system_events for audit trail
 */

import { supabase } from "@/integrations/supabase/client";

export type AuthEventType = 'leaked_password_blocked' | 'weak_password_blocked' | 'signup_failed' | 'password_reset_failed';

interface AuthEventMeta {
  flow: 'signup' | 'reset_password' | 'change_password';
  reason?: string;
  // Never log actual passwords or full emails
}

/**
 * Log an authentication security event to system_events
 * @param eventType - Type of auth event
 * @param meta - Additional metadata (no PII)
 */
export async function logAuthSecurityEvent(
  eventType: AuthEventType,
  meta: AuthEventMeta
): Promise<void> {
  try {
    await supabase.rpc('rpc_log_system_event', {
      p_source: 'auth_password_policy',
      p_severity: 'info',
      p_env: import.meta.env.MODE === 'production' ? 'prod' : 'dev',
      p_code: eventType.toUpperCase(),
      p_message: `Auth security event: ${eventType}`,
      p_meta: {
        flow: meta.flow,
        reason: meta.reason || eventType,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    // Silently fail - logging should not break auth flow
    console.warn('[authLogging] Failed to log security event:', error);
  }
}
