/**
 * TAEX-245: Canonical Transaction Schema and Adapter Types
 * 
 * This file defines the single source of truth for transaction data used by:
 * - Operations table
 * - KPIs and charts
 * - Exports
 */

import { NormalizedPaymentMode } from '../normalizePaymentMode';
import { OperationCategory } from '../operationCategory';

/**
 * Supported CSV providers
 */
export type CsvProvider = 'wiline' | 'lmcontrol' | 'ck_square' | 'electrocablage' | 'unknown';

/**
 * Provider display names for UI
 */
export const PROVIDER_DISPLAY_NAMES: Record<CsvProvider, string> = {
  wiline: 'Wi-Line',
  lmcontrol: 'LM Control',
  ck_square: 'CK Square',
  electrocablage: 'Electrocâblage',
  unknown: 'Inconnu',
};

/**
 * Canonical Transaction Schema (internal format)
 * 
 * All providers must convert their CSV data to this format.
 * Money fields are stored in cents for precision.
 */
export interface CanonicalTransaction {
  // Source tracking
  source_file_name: string;
  row_index_in_file: number;
  provider: CsvProvider;
  
  // Time fields
  occurred_at: Date | null;        // Full datetime (computed from date+time)
  date_local: string | null;       // ISO date (YYYY-MM-DD) for UI grouping
  time_local: string | null;       // Time (HH:MM) for UI display
  
  // Display fields (stable labels per provider)
  display_label: string;           // Main label shown in UI (machine/service name)
  machine_label: string | null;    // Separate machine name if applicable
  category: TransactionCategory | null;  // washing/drying/service
  operation_category: OperationCategory | null; // TAEX-301: CYCLE/PRODUCT/OPTION
  
  // Payment
  payment_mode: NormalizedPaymentMode | null;
  
  // Money fields (all in cents)
  inserted_cents: number | null;   // "Inséré" - amount inserted by customer
  price_cents: number;             // "Prix" - true item price (required)
  change_cents: number | null;     // "Rendu" - change returned
  
  // Payment breakdown (always present, default 0)
  price_cb_cents: number;
  price_esp_cents: number;
  price_fi_cents: number;
  
  // Revenue tracking
  revenue_included: boolean;       // Whether this counts towards CA
  
  // Raw traceability
  raw_source_id: string | null;    // Provider row id / transaction number
  raw_payload: Record<string, unknown>;  // Full parsed row for debugging
  
  // Validation
  validation_status: 'importable' | 'to_review' | 'invalid';
  validation_errors: string[];
  validation_warnings: string[];
  
  // Selection state for UI
  selected: boolean;

  // Deduplication (computed client-side)
  dedupe_key?: string;
}

/**
 * Transaction categories
 */
export type TransactionCategory = 
  | 'LAVE_LINGE'      // Washing machine
  | 'SECHE_LINGE'     // Dryer
  | 'LESSIVE'         // Detergent
  | 'DETACHANT'       // Stain remover
  | 'ASSOUPLISSANT'   // Fabric softener
  | 'CYCLE'           // Generic machine cycle
  | 'SERVICE'         // Other service
  | 'RECHARGEMENT'    // Card recharge (excluded from revenue)
  | 'OTHER';

/**
 * Provider-specific site configuration
 */
export interface SiteProviderConfig {
  site_id: string;
  provider: CsvProvider;
  site_name?: string;
  timezone?: string;  // Default: 'Europe/Paris'
}

/**
 * CSV Adapter interface
 * 
 * Each provider implements this interface to convert their CSV format
 * to the canonical transaction schema.
 */
export interface CsvAdapter {
  /** Provider identifier */
  readonly provider: CsvProvider;
  
  /** Human-readable provider name */
  readonly displayName: string;
  
  /**
   * Detect if a CSV file matches this provider's format
   * @param headers - Parsed CSV headers
   * @param sampleRows - First few rows of data for format detection
   * @returns Confidence score (0-1) that this is the correct provider
   */
  detectFormat(headers: string[], sampleRows?: string[][]): number;
  
  /**
   * Parse CSV content to canonical transactions
   * @param filename - Source file name
   * @param content - Raw CSV content
   * @param config - Site-specific configuration
   * @returns Array of canonical transactions
   */
  parse(
    filename: string, 
    content: string, 
    config: SiteProviderConfig
  ): CanonicalTransaction[];
  
  /**
   * Get expected header patterns for format detection UI
   */
  getExpectedHeaders(): string[];
}

/**
 * Adapter registry interface
 */
export interface AdapterRegistry {
  /** Get all registered adapters */
  getAdapters(): CsvAdapter[];
  
  /** Get adapter by provider ID */
  getAdapter(provider: CsvProvider): CsvAdapter | null;
  
  /** Detect the best matching adapter for a CSV file */
  detectAdapter(headers: string[], sampleRows?: string[][]): CsvAdapter | null;
  
  /** Validate that CSV matches the expected provider */
  validateProviderMatch(
    headers: string[], 
    expectedProvider: CsvProvider
  ): { matches: boolean; detectedProvider: CsvProvider | null; confidence: number };
}

/**
 * Import result with detailed statistics
 */
export interface CanonicalImportResult {
  success: boolean;
  imported_count: number;
  ignored_count: number;
  duplicate_count: number;
  errors: string[];
  warnings: string[];
  
  // Breakdown
  by_payment_mode: {
    cb_count: number;
    esp_count: number;
    fi_count: number;
    unknown_count: number;
  };
  
  // Date range
  date_range: {
    min: string | null;
    max: string | null;
  };
  
  // Provider info
  provider_detected: CsvProvider;
  provider_mismatch_warning: boolean;
}

/**
 * Business invariant validation result
 */
export interface InvariantValidation {
  valid: boolean;
  errors: string[];
  fixed_fields: string[];
}

/**
 * Validate and enforce business invariants on a canonical transaction
 * 
 * Rules:
 * - price_cents > 0 for real operations
 * - Payment breakdown matches payment_mode:
 *   - CB => price_cb_cents = price_cents, others = 0
 *   - ESP => price_esp_cents = price_cents, others = 0
 *   - FI => price_fi_cents = price_cents, others = 0
 * - ESP can have inserted_cents and change_cents
 * - CB/FI set inserted_cents and change_cents to null
 */
export function enforceBusinessInvariants(tx: CanonicalTransaction): InvariantValidation {
  const errors: string[] = [];
  const fixed_fields: string[] = [];
  
  // Store original values for debugging
  const originalPaymentBreakdown = {
    price_cb_cents: tx.price_cb_cents,
    price_esp_cents: tx.price_esp_cents,
    price_fi_cents: tx.price_fi_cents,
  };
  
  // Validate price
  if (tx.revenue_included && tx.price_cents <= 0) {
    errors.push(`Prix invalide: ${tx.price_cents} centimes`);
  }
  
  // Enforce payment breakdown based on payment_mode
  const mode = tx.payment_mode;
  
  if (mode === 'CB') {
    if (tx.price_cb_cents !== tx.price_cents) {
      tx.price_cb_cents = tx.price_cents;
      fixed_fields.push('price_cb_cents');
    }
    if (tx.price_esp_cents !== 0) {
      tx.price_esp_cents = 0;
      fixed_fields.push('price_esp_cents');
    }
    if (tx.price_fi_cents !== 0) {
      tx.price_fi_cents = 0;
      fixed_fields.push('price_fi_cents');
    }
    // CB doesn't use inserted/change
    if (tx.inserted_cents !== null) {
      tx.inserted_cents = null;
      fixed_fields.push('inserted_cents');
    }
    if (tx.change_cents !== null) {
      tx.change_cents = null;
      fixed_fields.push('change_cents');
    }
  } else if (mode === 'ESP') {
    if (tx.price_esp_cents !== tx.price_cents) {
      tx.price_esp_cents = tx.price_cents;
      fixed_fields.push('price_esp_cents');
    }
    if (tx.price_cb_cents !== 0) {
      tx.price_cb_cents = 0;
      fixed_fields.push('price_cb_cents');
    }
    if (tx.price_fi_cents !== 0) {
      tx.price_fi_cents = 0;
      fixed_fields.push('price_fi_cents');
    }
    // ESP can have inserted/change - don't modify
  } else if (mode === 'FI') {
    if (tx.price_fi_cents !== tx.price_cents) {
      tx.price_fi_cents = tx.price_cents;
      fixed_fields.push('price_fi_cents');
    }
    if (tx.price_cb_cents !== 0) {
      tx.price_cb_cents = 0;
      fixed_fields.push('price_cb_cents');
    }
    if (tx.price_esp_cents !== 0) {
      tx.price_esp_cents = 0;
      fixed_fields.push('price_esp_cents');
    }
    // FI doesn't use inserted/change
    if (tx.inserted_cents !== null) {
      tx.inserted_cents = null;
      fixed_fields.push('inserted_cents');
    }
    if (tx.change_cents !== null) {
      tx.change_cents = null;
      fixed_fields.push('change_cents');
    }
  } else if (mode === 'MIX') {
    // For mixed payments, sum should equal price_cents
    // This is handled by the adapter - just validate
    const sum = tx.price_cb_cents + tx.price_esp_cents + tx.price_fi_cents;
    if (sum !== tx.price_cents && tx.revenue_included) {
      errors.push(`Paiement mixte: somme (${sum}) ≠ prix (${tx.price_cents})`);
    }
  } else {
    // Unknown payment mode - clear all breakdowns
    tx.price_cb_cents = 0;
    tx.price_esp_cents = 0;
    tx.price_fi_cents = 0;
    fixed_fields.push('price_cb_cents', 'price_esp_cents', 'price_fi_cents');
  }
  
  // Store validation warnings in raw_payload
  if (fixed_fields.length > 0) {
    tx.raw_payload.validation_warnings = [
      `Fixed fields: ${fixed_fields.join(', ')}`,
      `Original breakdown: CB=${originalPaymentBreakdown.price_cb_cents}, ESP=${originalPaymentBreakdown.price_esp_cents}, FI=${originalPaymentBreakdown.price_fi_cents}`,
    ];
    tx.validation_warnings.push(...(tx.raw_payload.validation_warnings as string[]));
  }
  
  return {
    valid: errors.length === 0,
    errors,
    fixed_fields,
  };
}

/**
 * Convert canonical transaction to database operation format
 */
export function canonicalToDbOperation(
  tx: CanonicalTransaction,
  userId: string,
  siteId: string,
  batchId: string
): Record<string, unknown> {
  return {
    user_id: userId,
    site_id: siteId,
    operation_date: tx.date_local,
    operation_time: tx.time_local,
    amount: tx.price_cents / 100,  // Convert to euros
    machine: tx.display_label,
    machine_name: tx.machine_label,
    program: tx.category,
    payment_mode: tx.payment_mode,
    inserted_eur: tx.inserted_cents !== null ? tx.inserted_cents / 100 : null,
    price_eur: tx.price_cents / 100,
    change_eur: tx.change_cents !== null ? tx.change_cents / 100 : null,
    price_cb: tx.price_cb_cents > 0 ? tx.price_cb_cents / 100 : null,
    price_esp: tx.price_esp_cents > 0 ? tx.price_esp_cents / 100 : null,
    price_fi: tx.price_fi_cents > 0 ? tx.price_fi_cents / 100 : null,
    type: tx.category,
    source: tx.provider,
    import_batch_id: batchId,
    raw_data: { original: tx.raw_payload },
    raw: tx.raw_payload,
  };
}
