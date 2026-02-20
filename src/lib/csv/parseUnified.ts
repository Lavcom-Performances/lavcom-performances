/**
 * TAEX-245 Commande 3 — Unified CSV Parser
 * 
 * Single entry point that:
 * 1. Auto-detects provider via adapterRegistry
 * 2. Parses through the canonical adapter pipeline (CanonicalTransaction)
 * 3. Maps back to MultiCsvParsedRow for backward compatibility
 * 
 * Falls back to legacy parseMultiCsvFile when no adapter matches.
 */

import { adapterRegistry, parseHeadersFromContent } from './adapters/index';
import { CanonicalTransaction, SiteProviderConfig, CsvProvider } from './adapters/types';
import { MultiCsvParsedRow, CsvFormatType } from './multiCsvTypes';
import { parseMultiCsvFile as legacyParse } from './parseMultiCsv';

/**
 * Map CsvProvider to CsvFormatType for backward compat
 */
function providerToFormatType(provider: CsvProvider): CsvFormatType {
  switch (provider) {
    case 'wiline': return 'wiline';
    case 'lmcontrol': return 'lm_control';
    default: return 'unknown';
  }
}

/**
 * Convert a CanonicalTransaction to a MultiCsvParsedRow
 * Preserves all fields expected by the existing test suite (T1–T14)
 */
function canonicalToMultiCsvRow(
  tx: CanonicalTransaction,
  detectedFormat: CsvFormatType
): MultiCsvParsedRow {
  return {
    // Source tracking
    source_file_name: tx.source_file_name,
    row_index_in_file: tx.row_index_in_file,

    // Normalized data
    date_iso: tx.date_local,
    time: tx.time_local,
    normalized_mode: tx.payment_mode,
    amount_cents: tx.price_cents,

    // Original data
    machine: tx.raw_payload?.selection as string ?? tx.machine_label ?? null,
    program: tx.raw_payload?.description as string ?? tx.display_label ?? null,
    raw_data: [], // Not available from canonical

    // Extended fields
    inserted_cents: tx.inserted_cents,
    price_cents: tx.price_cents,
    change_cents: tx.change_cents,
    machine_name: tx.machine_label,

    // Format detection
    detected_type: detectedFormat,

    // Validation
    status: tx.validation_status,
    errors: [...tx.validation_errors],
    selected: tx.selected,

    // WiLine-specific fields (populated from raw_payload)
    provider: tx.provider === 'wiline' || tx.provider === 'lmcontrol' ? tx.provider : undefined,
    external_id: tx.raw_source_id ?? undefined,
    transaction_no: tx.raw_source_id ?? undefined,
    type_raw: tx.raw_payload?.type as string ?? null,
    label: tx.display_label ?? null,
    operation_type: tx.category ?? null,
    revenue_included: tx.revenue_included,
    prix_cb_cents: tx.price_cb_cents,
    prix_esp_cents: tx.price_esp_cents,
    prix_fi_cents: tx.price_fi_cents,
    metadata_raw: tx.raw_payload,
    is_mixed_payment: tx.payment_mode === 'MIX' || (tx.raw_payload?.is_mixed as boolean) === true,
  };
}

/**
 * Unified CSV parser — single entry point
 * 
 * @param filename  - Source file name
 * @param content   - Raw CSV text
 * @param siteConfig - Optional site config (provider hint, timezone, etc.)
 * @returns MultiCsvParsedRow[] for backward compatibility
 */
export function parseUnifiedCsvFile(
  filename: string,
  content: string,
  siteConfig?: Partial<SiteProviderConfig>,
): MultiCsvParsedRow[] {
  // 1. Detect provider via adapter registry
  const headers = parseHeadersFromContent(content);
  const adapter = adapterRegistry.detectAdapter(headers);

  // 2. If no adapter matches, fall back to legacy parser
  if (!adapter) {
    console.log('[parseUnified] No adapter matched, falling back to legacy parser');
    return legacyParse(filename, content);
  }

  const provider = adapter.provider;
  const detectedFormat = providerToFormatType(provider);

  console.log(`[parseUnified] Adapter matched: ${adapter.displayName} (confidence from headers)`);

  // 3. Build site config for adapter
  const config: SiteProviderConfig = {
    site_id: siteConfig?.site_id ?? 'unknown',
    provider,
    site_name: siteConfig?.site_name,
    timezone: siteConfig?.timezone ?? 'Europe/Paris',
  };

  // 4. Parse through canonical adapter
  const canonicalRows = adapter.parse(filename, content, config);

  // 5. Map canonical → MultiCsvParsedRow for backward compat
  return canonicalRows.map(tx => canonicalToMultiCsvRow(tx, detectedFormat));
}

/**
 * Detect provider from raw CSV content (convenience wrapper)
 */
export function detectProvider(content: string): CsvProvider | null {
  const headers = parseHeadersFromContent(content);
  const adapter = adapterRegistry.detectAdapter(headers);
  return adapter?.provider ?? null;
}
