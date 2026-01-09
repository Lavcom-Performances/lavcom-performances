/**
 * WiLine CSV Parser - TAEX-180
 * 
 * Parses WiLine provider CSV files to canonical operations schema.
 * 
 * DÉCISIONS VALIDÉES:
 * - CA = uniquement lignes Type="Démarrage"
 * - Fidélité (FI) = consommation de crédit, compte dans CA, stocké en PRIX_FI
 * - Produits: Lessive/Détachant/Assouplissant → types dédiés
 */

import { normalizeCsvText, detectSeparator, parseCsvLine } from './normalizeCsvText';
import { MultiCsvParsedRow } from './multiCsvTypes';
import { NormalizedPaymentMode } from './normalizePaymentMode';

// WiLine specific headers
const WILINE_REQUIRED_HEADERS = ['n° transaction', 'carte bancaire', 'fidélitée'];

/**
 * Detect if headers are WiLine format
 */
export function isWiLineFormat(headers: string[]): boolean {
  const headersLower = headers.map(h => h.toLowerCase().trim());
  return WILINE_REQUIRED_HEADERS.every(req => 
    headersLower.some(h => h.includes(req.replace('é', 'e')) || h.includes(req))
  );
}

/**
 * WiLine column mapping
 */
interface WiLineColumnMap {
  transactionNo: number;
  dateTime: number;
  type: number;
  details: number;
  selection: number;
  description: number;
  piece: number;       // Pièce (coins)
  billet: number;      // Billet (bills)
  carteBancaire: number; // CB
  fidelite: number;    // FI (loyalty credit)
  prix: number;        // Price
  inseree: number;     // Inserted
  rendue: number;      // Change returned
}

/**
 * Detect WiLine column positions from headers
 */
function detectWiLineColumns(headers: string[]): WiLineColumnMap | null {
  const findColumn = (patterns: string[]): number => {
    return headers.findIndex(h => {
      const lower = h.toLowerCase().trim();
      return patterns.some(p => lower.includes(p) || lower === p);
    });
  };

  const map: WiLineColumnMap = {
    transactionNo: findColumn(['n° transaction', 'n transaction', 'transaction']),
    dateTime: findColumn(['date/heure', 'date heure', 'datetime']),
    type: findColumn(['type']),
    details: findColumn(['details', 'détails']),
    selection: findColumn(['selection', 'sélection']),
    description: findColumn(['description']),
    piece: findColumn(['pièce', 'piece']),
    billet: findColumn(['billet']),
    carteBancaire: findColumn(['carte bancaire', 'cb']),
    fidelite: findColumn(['fidélitée', 'fidelite', 'fidélité']),
    prix: findColumn(['prix']),
    inseree: findColumn(['insérée', 'inseree']),
    rendue: findColumn(['rendue', 'rendu']),
  };

  // Validate required columns
  if (map.transactionNo === -1 || map.dateTime === -1 || map.prix === -1) {
    return null;
  }

  return map;
}

/**
 * Parse French number (comma as decimal separator)
 */
function parseFrenchNumber(value: string | undefined): number {
  if (!value || value.trim() === '') return 0;
  const cleaned = value.trim().replace(/\s/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Convert euros to cents (WiLine amounts are in euros)
 */
function eurosToCents(euros: number): number {
  return Math.round(euros * 100);
}

/**
 * Parse WiLine date/time string
 * Format: "DD/MM/YYYY HH:MM:SS" (Europe/Paris timezone)
 */
function parseWiLineDateTime(dateStr: string): { date_iso: string | null; time: string | null } {
  if (!dateStr || !dateStr.trim()) {
    return { date_iso: null, time: null };
  }

  const trimmed = dateStr.trim();
  
  // Match DD/MM/YYYY HH:MM:SS or DD/MM/YYYY HH:MM
  const match = trimmed.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  
  if (match) {
    const [, day, month, year, hour, minute] = match;
    const paddedDay = day.padStart(2, '0');
    const paddedMonth = month.padStart(2, '0');
    const date_iso = `${year}-${paddedMonth}-${paddedDay}`;
    const time = `${hour.padStart(2, '0')}:${minute}`;
    return { date_iso, time };
  }

  // Try just date without time
  const dateOnlyMatch = trimmed.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
  if (dateOnlyMatch) {
    const [, day, month, year] = dateOnlyMatch;
    const paddedDay = day.padStart(2, '0');
    const paddedMonth = month.padStart(2, '0');
    const date_iso = `${year}-${paddedMonth}-${paddedDay}`;
    return { date_iso, time: null };
  }

  return { date_iso: null, time: null };
}

/**
 * Determine operation type from description
 */
function detectOperationType(description: string): string | null {
  if (!description) return null;
  
  const lower = description.toLowerCase();
  
  if (lower.includes('lessive')) return 'LESSIVE';
  if (lower.includes('détachant') || lower.includes('detachant')) return 'DETACHANT';
  if (lower.includes('assouplissant')) return 'ASSOUPLISSANT';
  if (lower.includes('machine') || lower.includes('séchoir') || lower.includes('sechoir')) return 'CYCLE';
  
  return 'OTHER';
}

/**
 * Determine payment mode and amounts
 * Returns normalized mode and amount breakdown in cents
 */
function normalizeWiLinePayment(
  piece: number,
  billet: number,
  carteBancaire: number,
  fidelite: number,
  prixTotal: number
): {
  mode: NormalizedPaymentMode | 'MIX' | null;
  prix_cb_cents: number;
  prix_esp_cents: number;
  prix_fi_cents: number;
  isMixed: boolean;
} {
  const cashPaid = (piece + billet) > 0;
  const cardPaid = carteBancaire > 0;
  const creditUsed = fidelite > 0;
  
  const prixCents = eurosToCents(prixTotal);
  
  // Count active payment methods
  const activeCount = [cashPaid, cardPaid, creditUsed].filter(Boolean).length;
  
  // Single payment method
  if (activeCount === 1) {
    if (creditUsed) {
      return {
        mode: 'FI',
        prix_cb_cents: 0,
        prix_esp_cents: 0,
        prix_fi_cents: prixCents,
        isMixed: false,
      };
    }
    if (cashPaid) {
      return {
        mode: 'ESP',
        prix_cb_cents: 0,
        prix_esp_cents: prixCents,
        prix_fi_cents: 0,
        isMixed: false,
      };
    }
    if (cardPaid) {
      return {
        mode: 'CB',
        prix_cb_cents: prixCents,
        prix_esp_cents: 0,
        prix_fi_cents: 0,
        isMixed: false,
      };
    }
  }
  
  // Mixed payment (V1: put all in CB if card_paid, else ESP)
  if (activeCount > 1) {
    if (cardPaid) {
      return {
        mode: 'MIX',
        prix_cb_cents: prixCents,
        prix_esp_cents: 0,
        prix_fi_cents: 0,
        isMixed: true,
      };
    }
    return {
      mode: 'MIX',
      prix_cb_cents: 0,
      prix_esp_cents: prixCents,
      prix_fi_cents: 0,
      isMixed: true,
    };
  }
  
  // No payment method detected (edge case)
  if (prixTotal > 0) {
    return {
      mode: null,
      prix_cb_cents: 0,
      prix_esp_cents: prixCents,
      prix_fi_cents: 0,
      isMixed: false,
    };
  }
  
  return {
    mode: null,
    prix_cb_cents: 0,
    prix_esp_cents: 0,
    prix_fi_cents: 0,
    isMixed: false,
  };
}

/**
 * Check if a row is a TOTAUX line to skip
 */
function isTotauxRow(description: string, transactionNo: string): boolean {
  if (!transactionNo || transactionNo.trim() === '') return true;
  if (description && description.toUpperCase().includes('TOTAUX')) return true;
  return false;
}

/**
 * Check if a row counts towards revenue (CA)
 * Only Type="Démarrage" counts for revenue
 */
function isRevenueRow(type: string): boolean {
  if (!type) return false;
  return type.toLowerCase().trim() === 'démarrage' || 
         type.toLowerCase().trim() === 'demarrage';
}

/**
 * Extended WiLine parsed row with additional fields
 */
export interface WiLineParsedRow extends MultiCsvParsedRow {
  // WiLine specific
  provider: 'wiline';
  external_id: string;
  transaction_no: string;
  type_raw: string | null;
  label: string | null;
  operation_type: string | null;
  
  // Revenue tracking
  revenue_included: boolean;
  
  // Payment breakdown (in cents)
  prix_cb_cents: number;
  prix_esp_cents: number;
  prix_fi_cents: number;
  
  // Metadata
  metadata_raw: Record<string, unknown>;
  is_mixed_payment: boolean;
}

/**
 * Parse a WiLine CSV file
 */
export function parseWiLineCsvFile(
  filename: string,
  content: string
): WiLineParsedRow[] {
  const normalized = normalizeCsvText(content);
  const separator = detectSeparator(normalized);
  const lines = normalized.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    return [];
  }
  
  // Find header line
  let headerIndex = 0;
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const fields = parseCsvLine(lines[i], separator);
    if (fields.length >= 3 && fields.some(f => /[a-zA-Z]/.test(f))) {
      headerIndex = i;
      break;
    }
  }
  
  const headerFields = parseCsvLine(lines[headerIndex], separator);
  const columnMap = detectWiLineColumns(headerFields);
  
  if (!columnMap) {
    console.warn('WiLine: Could not detect column mapping');
    return [];
  }
  
  const rows: WiLineParsedRow[] = [];
  
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const rowIndex = i - headerIndex - 1;
    const rawData = parseCsvLine(lines[i], separator);
    
    // Skip empty rows
    if (!rawData.some(cell => cell.trim())) continue;
    
    // Extract values
    const transactionNo = rawData[columnMap.transactionNo] || '';
    const dateTimeStr = rawData[columnMap.dateTime] || '';
    const typeRaw = columnMap.type >= 0 ? rawData[columnMap.type] || '' : '';
    const details = columnMap.details >= 0 ? rawData[columnMap.details] || '' : '';
    const selection = columnMap.selection >= 0 ? rawData[columnMap.selection] || '' : '';
    const description = columnMap.description >= 0 ? rawData[columnMap.description] || '' : '';
    const piece = parseFrenchNumber(rawData[columnMap.piece]);
    const billet = parseFrenchNumber(rawData[columnMap.billet]);
    const carteBancaire = parseFrenchNumber(rawData[columnMap.carteBancaire]);
    const fidelite = parseFrenchNumber(rawData[columnMap.fidelite]);
    const prix = parseFrenchNumber(rawData[columnMap.prix]);
    const inseree = columnMap.inseree >= 0 ? parseFrenchNumber(rawData[columnMap.inseree]) : 0;
    const rendue = columnMap.rendue >= 0 ? parseFrenchNumber(rawData[columnMap.rendue]) : 0;
    
    // Skip TOTAUX rows
    if (isTotauxRow(description, transactionNo)) {
      continue;
    }
    
    // Parse date/time
    const { date_iso, time } = parseWiLineDateTime(dateTimeStr);
    
    // Determine if counts towards revenue
    const revenueIncluded = isRevenueRow(typeRaw);
    
    // Normalize payment
    const payment = normalizeWiLinePayment(piece, billet, carteBancaire, fidelite, prix);
    
    // Determine operation type
    const operationType = detectOperationType(description);
    
    // Build metadata
    const metadata_raw: Record<string, unknown> = {
      details,
      selection,
      piece,
      billet,
      carte_bancaire: carteBancaire,
      fidelite,
      inseree,
      rendue,
    };
    
    // Validation
    const errors: string[] = [];
    let status: 'importable' | 'to_review' | 'invalid' = 'importable';
    
    if (!date_iso) {
      errors.push('Date manquante ou invalide');
      status = 'invalid';
    }
    
    if (!payment.mode) {
      if (prix > 0) {
        errors.push('Mode de paiement non détecté');
        status = 'to_review';
      } else {
        errors.push('Montant nul');
        status = 'invalid';
      }
    }
    
    if (prix <= 0) {
      errors.push('Montant invalide ou nul');
      if (status !== 'invalid') status = 'to_review';
    }
    
    const prixCents = eurosToCents(prix);
    const insereeCents = eurosToCents(inseree);
    const rendueCents = eurosToCents(rendue);
    
    rows.push({
      // Base MultiCsvParsedRow fields
      source_file_name: filename,
      row_index_in_file: rowIndex,
      date_iso,
      time,
      normalized_mode: payment.mode === 'MIX' ? 'CB' : (payment.mode as NormalizedPaymentMode | null), // For display, MIX shows as CB
      amount_cents: prixCents,
      machine: description || null,
      program: selection || null,
      raw_data: rawData,
      inserted_cents: insereeCents,
      price_cents: prixCents,
      change_cents: rendueCents,
      machine_name: description || null,
      detected_type: 'wiline' as any, // Will be added to CsvFormatType
      status,
      errors,
      selected: status === 'importable',
      
      // WiLine specific
      provider: 'wiline',
      external_id: `wiline:${transactionNo}`,
      transaction_no: transactionNo,
      type_raw: typeRaw || null,
      label: description || null,
      operation_type: operationType,
      revenue_included: revenueIncluded,
      prix_cb_cents: payment.prix_cb_cents,
      prix_esp_cents: payment.prix_esp_cents,
      prix_fi_cents: payment.prix_fi_cents,
      metadata_raw,
      is_mixed_payment: payment.isMixed,
    });
  }
  
  return rows;
}
