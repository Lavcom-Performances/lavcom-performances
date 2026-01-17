/**
 * Audit logging utility for export operations.
 * Logs all exports to system_events for security and compliance tracking.
 */

import { supabase } from '@/integrations/supabase/client';

export type ExportType =
  | 'operations_csv'
  | 'operations_pdf'
  | 'invoices_csv'
  | 'report_pdf'
  | 'cron_logs_csv'
  | 'subscription_metrics_csv'
  | 'products_sales_csv'
  | 'monthly_revenue_csv'
  | 'annual_revenue_csv'
  | 'comparison_csv'
  | 'comparison_pdf'
  | 'profitability_csv'
  | 'profitability_pdf'
  | 'audit_logs_csv'
  | 'admin_logins_csv'
  | 'users_csv'
  | 'login_history_csv';

export interface ExportAuditParams {
  /** Type of export being performed */
  exportType: ExportType;
  /** Number of records exported */
  recordCount: number;
  /** Site ID if export is site-specific */
  siteId?: string;
  /** Date range start if applicable */
  dateFrom?: Date | string;
  /** Date range end if applicable */
  dateTo?: Date | string;
  /** Additional metadata */
  extra?: Record<string, unknown>;
}

/**
 * Logs an export action to system_events.
 * This is fire-and-forget to not block the UI.
 * 
 * @param params - Export audit parameters
 */
export async function logExport(params: ExportAuditParams): Promise<void> {
  const { exportType, recordCount, siteId, dateFrom, dateTo, extra } = params;
  
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.warn('[Export Audit] No authenticated user, skipping audit log');
      return;
    }
    
    // Build metadata
    const meta: Record<string, string | number | boolean | null> = {
      actor_user_id: user.id,
      actor_email: user.email || '',
      export_type: exportType,
      record_count: recordCount,
    };
    
    if (siteId) {
      meta.site_id = siteId;
    }
    
    if (dateFrom) {
      meta.date_from = typeof dateFrom === 'string' 
        ? dateFrom 
        : dateFrom.toISOString();
    }
    
    if (dateTo) {
      meta.date_to = typeof dateTo === 'string' 
        ? dateTo 
        : dateTo.toISOString();
    }
    
    // Merge extra data (flatten to avoid Json typing issues)
    if (extra) {
      for (const [key, value] of Object.entries(extra)) {
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          meta[key] = value;
        } else if (value === null) {
          meta[key] = null;
        } else {
          meta[key] = JSON.stringify(value);
        }
      }
    }
    
    // Insert system event
    const { error } = await supabase
      .from('system_events')
      .insert([{
        source: 'export',
        severity: 'info',
        code: `EXPORT_${exportType.toUpperCase()}`,
        message: `Export ${exportType}: ${recordCount} record(s) exported`,
        meta,
      }]);
    
    if (error) {
      console.error('[Export Audit] Failed to log export:', error);
    }
  } catch (err) {
    // Non-blocking - just log to console
    console.error('[Export Audit] Error logging export:', err);
  }
}

/**
 * Creates an export audit logger function pre-bound to an export type.
 * Useful for components that export a specific type of data.
 * 
 * @param exportType - The type of export
 * @returns A function that logs exports of that type
 */
export function createExportLogger(exportType: ExportType) {
  return (params: Omit<ExportAuditParams, 'exportType'>) => 
    logExport({ ...params, exportType });
}
