/**
 * Types for multi-CSV import functionality
 * TAEX-197: Import guardrails
 */

import { NormalizedPaymentMode } from './normalizePaymentMode';
import { CSV_MAX_FILES_PER_BATCH } from '@/lib/rateLimiter';

// Re-export from centralized config
export const MAX_FILES_PER_IMPORT = CSV_MAX_FILES_PER_BATCH;
export const MAX_PREVIEW_ROWS_PER_FILE = 50;

/**
 * Extended parsed row with multi-CSV metadata
 */
/**
 * Detected CSV format type
 */
export type CsvFormatType = 'events' | 'lm_control' | 'wiline' | 'standard' | 'unknown';

export interface MultiCsvParsedRow {
  // Source tracking
  source_file_name: string;
  row_index_in_file: number;
  
  // Normalized data
  date_iso: string | null;
  time: string | null;
  normalized_mode: NormalizedPaymentMode | null;
  amount_cents: number | null;
  
  // Original data
  machine: string | null;
  program: string | null;
  raw_data: string[];
  
  // Extended fields (for Events format)
  inserted_cents: number | null;
  price_cents: number | null;
  change_cents: number | null;
  machine_name: string | null;
  
  // Format detection
  detected_type: CsvFormatType;
  
  // Validation status
  status: 'importable' | 'to_review' | 'invalid';
  errors: string[];
  
  // Selection state
  selected: boolean;
  
  // WiLine specific (optional)
  provider?: 'wiline' | 'lmcontrol';
  external_id?: string;
  transaction_no?: string;
  type_raw?: string | null;
  label?: string | null;
  operation_type?: string | null;
  revenue_included?: boolean;
  prix_cb_cents?: number;
  prix_esp_cents?: number;
  prix_fi_cents?: number;
  metadata_raw?: Record<string, unknown>;
  is_mixed_payment?: boolean;
}

/**
 * Aggregated summary for multi-CSV import
 */
export interface MultiCsvSummary {
  total_files: number;
  total_rows: number;
  
  // By status
  importable_count: number;
  to_review_count: number;
  invalid_count: number;
  
  // By payment mode (in cents)
  total_cb_cents: number;
  total_esp_cents: number;
  total_fi_cents: number;
  
  // Display values (in euros)
  total_cb_esp_display: number;
  total_fi_display: number;
  
  // Date range
  min_date: string | null;
  max_date: string | null;
  
  // Selected for import
  selected_count: number;
}

/**
 * Result of multi-CSV import
 */
export interface MultiCsvImportResult {
  success: boolean;
  inserted_count: number;
  skipped_count: number;
  skipped_details: Array<{
    file: string;
    row: number;
    reason: string;
  }>;
  errors: string[];
}

/**
 * File metadata for multi-CSV wizard
 */
export interface MultiCsvFile {
  id: string;
  file: File;
  status: 'pending' | 'parsing' | 'ready' | 'importing' | 'success' | 'error';
  site_id: string | null;
  site_name?: string;
  
  // Parsed data
  parsed_rows: MultiCsvParsedRow[];
  
  // Summary
  total_rows: number;
  importable_count: number;
  to_review_count: number;
  invalid_count: number;
  
  // Format detection
  detected_format: CsvFormatType;
  
  // Error
  error: string | null;
  duplicate_warning: string | null;
  
  // Import result
  import_result?: {
    imported: number;
    ignored: number;
    duplicates: number;
    errors: string[];
  };
}

/**
 * Calculate summary from parsed rows
 */
export function calculateMultiCsvSummary(
  files: MultiCsvFile[],
  allRows: MultiCsvParsedRow[]
): MultiCsvSummary {
  const importable = allRows.filter(r => r.status === 'importable');
  const toReview = allRows.filter(r => r.status === 'to_review');
  const invalid = allRows.filter(r => r.status === 'invalid');
  
  const selected = allRows.filter(r => r.selected);
  
  // Calculate totals by mode (only selected rows)
  let total_cb_cents = 0;
  let total_esp_cents = 0;
  let total_fi_cents = 0;
  
  selected.forEach(row => {
    if (row.amount_cents !== null) {
      switch (row.normalized_mode) {
        case 'CB':
          total_cb_cents += row.amount_cents;
          break;
        case 'ESP':
          total_esp_cents += row.amount_cents;
          break;
        case 'FI':
          total_fi_cents += row.amount_cents;
          break;
      }
    }
  });
  
  // Calculate date range
  const dates = allRows
    .filter(r => r.date_iso)
    .map(r => r.date_iso!)
    .sort();
  
  return {
    total_files: files.length,
    total_rows: allRows.length,
    importable_count: importable.length,
    to_review_count: toReview.length,
    invalid_count: invalid.length,
    total_cb_cents,
    total_esp_cents,
    total_fi_cents,
    total_cb_esp_display: (total_cb_cents + total_esp_cents) / 100,
    total_fi_display: total_fi_cents / 100,
    min_date: dates[0] || null,
    max_date: dates[dates.length - 1] || null,
    selected_count: selected.length,
  };
}
