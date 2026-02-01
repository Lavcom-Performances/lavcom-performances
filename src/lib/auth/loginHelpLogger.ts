/**
 * Login Help Event Logger
 * Logs user interactions with the login help system to system_events
 */

import { supabase } from '@/integrations/supabase/client';
import { AuthErrorCode } from './authErrorCodes';

export type LoginHelpEventType =
  | 'LOGIN_HELP_OPENED'
  | 'OTP_RESEND_CLICKED'
  | 'AUTH_ERROR_SHOWN'
  | 'RECOVERY_HELP_SELECTED'
  | 'SUPPORT_ESCALATION_CLICKED';

interface LoginHelpEventMeta {
  user_id?: string;
  device_id?: string;
  trace_id?: string;
  error_code?: AuthErrorCode;
  context?: string;
  tab?: string;
}

/**
 * Log a login help event to system_events
 * Silently fails to avoid interrupting user flow
 */
export async function logLoginHelpEvent(
  eventType: LoginHelpEventType,
  meta: LoginHelpEventMeta = {}
): Promise<void> {
  try {
    // Don't log sensitive data
    const sanitizedMeta = {
      user_id: meta.user_id || null,
      device_id: meta.device_id ? meta.device_id.substring(0, 8) + '...' : null,
      trace_id: meta.trace_id || null,
      error_code: meta.error_code || null,
      context: meta.context || null,
      tab: meta.tab || null,
      timestamp: new Date().toISOString(),
    };

    await supabase.rpc('rpc_log_system_event', {
      p_source: 'login_help',
      p_severity: 'info',
      p_env: import.meta.env.MODE === 'production' ? 'prod' : 'dev',
      p_code: eventType,
      p_message: `Login help event: ${eventType}`,
      p_meta: sanitizedMeta,
    });
  } catch (error) {
    // Silently fail - logging should not break user flow
    console.warn('[loginHelpLogger] Failed to log event:', error);
  }
}

/**
 * Log when user views an auth error
 */
export async function logAuthErrorShown(
  errorCode: AuthErrorCode,
  meta: Omit<LoginHelpEventMeta, 'error_code'> = {}
): Promise<void> {
  return logLoginHelpEvent('AUTH_ERROR_SHOWN', {
    ...meta,
    error_code: errorCode,
  });
}
