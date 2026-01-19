/**
 * Reusable hook for auto-logging CRUD operations to audit_logs
 * Usage: const { logAction } = useAuditLog('sites');
 *        await logAction('INSERT', siteId, { name: 'New Site' });
 */
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export type AuditAction = 'INSERT' | 'UPDATE' | 'DELETE' | 'SELECT' | 'EXPORT';

interface AuditLogOptions {
  /** Include browser/device info in metadata */
  includeUserAgent?: boolean;
  /** Custom source identifier for grouping logs */
  source?: string;
}

interface LogActionParams {
  action: AuditAction;
  targetId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Hook to log CRUD operations to the audit_logs table
 * @param targetTable - The table being operated on (e.g., 'sites', 'operations')
 * @param options - Optional configuration
 */
export function useAuditLog(targetTable: string, options: AuditLogOptions = {}) {
  const { includeUserAgent = true, source } = options;

  /**
   * Log an action to the audit_logs table
   * Fire-and-forget: does not block the calling operation
   */
  const logAction = useCallback(
    async (
      action: AuditAction,
      targetId?: string,
      metadata?: Record<string, unknown>
    ): Promise<string | null> => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        const enrichedMetadata: Record<string, unknown> = {
          ...metadata,
          timestamp: new Date().toISOString(),
        };
        
        if (source) {
          enrichedMetadata.source = source;
        }
        
        const { data, error } = await supabase.rpc('rpc_create_audit_log', {
          p_actor_id: user?.id || null,
          p_action: action,
          p_target_table: targetTable,
          p_target_id: targetId || null,
          p_metadata: enrichedMetadata as Json,
          p_user_agent: includeUserAgent ? navigator.userAgent : null,
          p_ip_hash: null, // IP hash should be set server-side
        });

        if (error) {
          console.error('[useAuditLog] Failed to log action:', error);
          return null;
        }

        return data as string;
      } catch (err) {
        console.error('[useAuditLog] Error logging action:', err);
        return null;
      }
    },
    [targetTable, includeUserAgent, source]
  );

  /**
   * Create a wrapped function that logs before executing
   */
  const withAuditLog = useCallback(
    <T extends (...args: unknown[]) => Promise<unknown>>(
      action: AuditAction,
      fn: T,
      getMetadata?: (...args: Parameters<T>) => { targetId?: string; metadata?: Record<string, unknown> }
    ): ((...args: Parameters<T>) => Promise<ReturnType<T>>) => {
      return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
        const { targetId, metadata } = getMetadata?.(...args) || {};
        
        // Fire-and-forget audit log
        logAction(action, targetId, metadata);
        
        // Execute the actual operation
        return fn(...args) as ReturnType<T>;
      };
    },
    [logAction]
  );

  /**
   * Convenience methods for common CRUD operations
   */
  const logInsert = useCallback(
    (targetId?: string, metadata?: Record<string, unknown>) =>
      logAction('INSERT', targetId, metadata),
    [logAction]
  );

  const logUpdate = useCallback(
    (targetId: string, metadata?: Record<string, unknown>) =>
      logAction('UPDATE', targetId, metadata),
    [logAction]
  );

  const logDelete = useCallback(
    (targetId: string, metadata?: Record<string, unknown>) =>
      logAction('DELETE', targetId, metadata),
    [logAction]
  );

  const logExport = useCallback(
    (metadata?: Record<string, unknown>) =>
      logAction('EXPORT', undefined, metadata),
    [logAction]
  );

  return {
    logAction,
    withAuditLog,
    logInsert,
    logUpdate,
    logDelete,
    logExport,
  };
}

/**
 * Standalone function to log audit events (for use outside React components)
 */
export async function logAuditEvent(
  targetTable: string,
  action: AuditAction,
  targetId?: string,
  metadata?: Record<string, unknown>
): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    const enrichedMetadata: Record<string, unknown> = {
      ...metadata,
      timestamp: new Date().toISOString(),
    };
    
    const { data, error } = await supabase.rpc('rpc_create_audit_log', {
      p_actor_id: user?.id || null,
      p_action: action,
      p_target_table: targetTable,
      p_target_id: targetId || null,
      p_metadata: enrichedMetadata as Json,
      p_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      p_ip_hash: null,
    });

    if (error) {
      console.error('[logAuditEvent] Failed to log action:', error);
      return null;
    }

    return data as string;
  } catch (err) {
    console.error('[logAuditEvent] Error logging action:', err);
    return null;
  }
}

/**
 * Create a pre-configured audit logger for a specific table
 */
export function createTableAuditLogger(targetTable: string, source?: string) {
  return {
    logInsert: (targetId?: string, metadata?: Record<string, unknown>) =>
      logAuditEvent(targetTable, 'INSERT', targetId, { ...metadata, source }),
    logUpdate: (targetId: string, metadata?: Record<string, unknown>) =>
      logAuditEvent(targetTable, 'UPDATE', targetId, { ...metadata, source }),
    logDelete: (targetId: string, metadata?: Record<string, unknown>) =>
      logAuditEvent(targetTable, 'DELETE', targetId, { ...metadata, source }),
    logExport: (metadata?: Record<string, unknown>) =>
      logAuditEvent(targetTable, 'EXPORT', undefined, { ...metadata, source }),
  };
}
