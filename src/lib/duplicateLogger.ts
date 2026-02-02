/**
 * Duplicate detection event logger
 * Logs site duplicate warnings and overrides to system_events
 * TAEX-236
 */

import { supabase } from "@/integrations/supabase/client";

export type DuplicateEventType = 
  | 'DUPLICATE_WARNING_SHOWN'
  | 'DUPLICATE_OVERRIDE'
  | 'ADMIN_GLOBAL_SEARCH';

interface DuplicateEventMeta {
  postal_code?: string;
  city?: string;
  country?: string;
  match_count?: number;
  created_site_id?: string;
  matched_site_ids?: string[];
  query_length?: number;
  results_users?: number;
  results_sites?: number;
}

/**
 * Log a duplicate-related event to system_events
 * Silently fails to avoid interrupting user flow
 */
export async function logDuplicateEvent(
  eventType: DuplicateEventType,
  meta: DuplicateEventMeta
): Promise<void> {
  try {
    await supabase.rpc('rpc_log_system_event', {
      p_source: 'site_duplicate_check',
      p_severity: eventType === 'DUPLICATE_OVERRIDE' ? 'warn' : 'info',
      p_env: import.meta.env.MODE === 'production' ? 'prod' : 'dev',
      p_code: eventType,
      p_message: `Site duplicate event: ${eventType}`,
      p_meta: {
        ...meta,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    // Silently fail - logging should not break site creation flow
    console.warn('[duplicateLogger] Failed to log event:', error);
  }
}

/**
 * Log admin global search event
 */
export async function logAdminSearchEvent(
  queryLength: number,
  resultsUsers: number,
  resultsSites: number
): Promise<void> {
  return logDuplicateEvent('ADMIN_GLOBAL_SEARCH', {
    query_length: queryLength,
    results_users: resultsUsers,
    results_sites: resultsSites,
  });
}
