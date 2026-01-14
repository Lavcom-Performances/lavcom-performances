/**
 * WiLine CSV Parser - TAEX-180
 * 
 * Parses WiLine provider CSV files to canonical operations schema.
 * 
 * DÉCISIONS VALIDÉES:
 * - CA = uniquement lignes Type="Démarrage"
 * - Fidélité (FI) = consommation de crédit, compte dans CA, stocké en PRIX_FI
 * - Produits: Lessive/Détachant/Assouplissant → types dédiés
 * 
 * FORMAT WILINE:
 * Headers: Date/Heure(Europe/Paris);;Type;Selection;Description;Pièce;Billet;Carte bancaire;Fidélitée;Prix;Insérée;Rendue
 * - Col 0: Date (DD/MM/YYYY 00:00)
 * - Col 1: Time (HH:MM:SS) - empty header
 * - Col 2: Type (Démarrage/Annulé)
 * - Col 3: Selection (machine number)
 * - Col 4: Description (machine name like "Séchoirs 13kg")
 * - Col 5-8: Payment methods (Pièce, Billet, Carte bancaire, Fidélitée)
 * - Col 9: Prix (in EUROS with comma decimal)
 * - Col 10: Insérée
 * - Col 11: Rendue
 */

import { normalizeCsvText, detectSeparator, parseCsvLine } from './normalizeCsvText';
import { MultiCsvParsedRow } from './multiCsvTypes';
import { NormalizedPaymentMode } from './normalizePaymentMode';

// WiLine specific headers - checking for key columns
const WILINE_HEADER_PATTERNS = [
  /date.*heure/i,
  /carte\s*bancaire/i,
  /fid[ée]lit[ée]e?/i,
];

/**
 * Detect if headers are WiLine format
 * WiLine has: Date/Heure;;Type;Selection;Description;Pièce;Billet;Carte bancaire;Fidélitée;Prix;Insérée;Rendue
 */
export function isWiLineFormat(headers: string[]): boolean {
  const headersStr = headers.join('|').toLowerCase();
  
  // Check for characteristic WiLine patterns
  const hasDateHeure = /date.*heure/i.test(headersStr);
  const hasCarteBancaire = /carte\s*bancaire/i.test(headersStr);
  const hasFidelite = /fid[ée]lit[ée]e?/i.test(headersStr);
  const hasPrix = headers.some(h => h.toLowerCase().trim() === 'prix');
  const hasInseree = /ins[ée]r[ée]e/i.test(headersStr);
  
  console.log('[WiLine-DEBUG] Format detection:', { hasDateHeure, hasCarteBancaire, hasFidelite, hasPrix, hasInseree });
  
  // WiLine format requires at least 3 of these patterns
  const matches = [hasDateHeure, hasCarteBancaire, hasFidelite, hasPrix, hasInseree].filter(Boolean).length;
  return matches >= 4;
}

/**
 * WiLine column mapping
 */
interface WiLineColumnMap {
  date: number;        // Date/Heure column (date part)
  time: number;        // Time column (empty header)
  type: number;        // Type (Démarrage/Annulé)
  selection: number;   // Selection (machine number like 22)
  description: number; // Description (machine name like "Séchoirs 13kg")
  piece: number;       // Pièce (coins)
  billet: number;      // Billet (bills)
  carteBancaire: number; // CB
  fidelite: number;    // FI (loyalty credit)
  prix: number;        // Price in euros
  inseree: number;     // Inserted
  rendue: number;      // Change returned
}

/**
 * Detect WiLine column positions from headers
 */
function detectWiLineColumns(headers: string[]): WiLineColumnMap | null {
  const findColumn = (patterns: (string | RegExp)[]): number => {
    return headers.findIndex(h => {
      const lower = h.toLowerCase().trim();
      return patterns.some(p => {
        if (typeof p === 'string') {
          return lower.includes(p) || lower === p;
        }
        return p.test(lower);
      });
    });
  };

  // WiLine format: Date/Heure(Europe/Paris);;Type;Selection;Description;Pièce;Billet;Carte bancaire;Fidélitée;Prix;Insérée;Rendue
  const map: WiLineColumnMap = {
    date: findColumn([/date.*heure/i, 'date/heure', 'date']),
    time: -1, // Will be set to 1 if date is at 0 and col 1 is empty
    type: findColumn(['type']),
    selection: findColumn(['selection', 'sélection']),
    description: findColumn(['description']),
    piece: findColumn(['pièce', 'piece', /^pi[èe]ce$/i]),
    billet: findColumn(['billet']),
    carteBancaire: findColumn([/carte\s*bancaire/i, 'cb']),
    fidelite: findColumn([/fid[ée]lit[ée]e?/i, 'fidelite']),
    prix: findColumn([/^prix$/i]),
    inseree: findColumn([/ins[ée]r[ée]e/i, 'inseree']),
    rendue: findColumn([/rendue?/i, 'rendu']),
  };

  // Handle WiLine special case: first col is date, second col (empty header) is time
  if (map.date === 0 && headers[1] === '') {
    map.time = 1;
    // Shift all other columns by 1 if they're wrong
    console.log('[WiLine-DEBUG] Detected date at 0, time at 1 (empty header)');
  }

  console.log('[WiLine-DEBUG] Column map:', map);
  console.log('[WiLine-DEBUG] Headers:', headers);

  // Validate minimum required columns
  if (map.date === -1 || map.prix === -1) {
    console.warn('[WiLine] Missing required columns: date or prix');
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
 * Parse WiLine date from first column
 * Format: "DD/MM/YYYY 00:00" or "DD/MM/YYYY"
 */
function parseWiLineDate(dateStr: string): string | null {
  if (!dateStr || !dateStr.trim()) return null;
  
  const trimmed = dateStr.trim();
  
  // Match DD/MM/YYYY with optional time
  const match = trimmed.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
  
  if (match) {
    const [, day, month, year] = match;
    const paddedDay = day.padStart(2, '0');
    const paddedMonth = month.padStart(2, '0');
    return `${year}-${paddedMonth}-${paddedDay}`;
  }
  
  return null;
}

/**
 * Parse WiLine time from second column
 * Format: "HH:MM:SS"
 */
function parseWiLineTime(timeStr: string): string | null {
  if (!timeStr || !timeStr.trim()) return null;
  
  const trimmed = timeStr.trim();
  
  // Match HH:MM:SS or HH:MM
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  
  if (match) {
    const [, hour, minute] = match;
    return `${hour.padStart(2, '0')}:${minute}`;
  }
  
  return null;
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
function isTotauxRow(description: string): boolean {
  if (description && description.toUpperCase().includes('TOTAUX')) return true;
  return false;
}

/**
 * Check if a row counts towards revenue (CA)
 * Only Type="Démarrage" counts for revenue
 */
function isRevenueRow(type: string): boolean {
  if (!type) return false;
  const lower = type.toLowerCase().trim();
  return lower === 'démarrage' || lower === 'demarrage';
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
  console.log('[WiLine-DEBUG] Starting parse for:', filename);
  
  const normalized = normalizeCsvText(content);
  const separator = detectSeparator(normalized);
  const lines = normalized.split('\n').filter(line => line.trim());
  
  console.log('[WiLine-DEBUG] Separator:', JSON.stringify(separator));
  console.log('[WiLine-DEBUG] Total lines:', lines.length);
  
  if (lines.length === 0) {
    console.log('[WiLine-DEBUG] No lines found');
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
  console.log('[WiLine-DEBUG] Header fields:', headerFields);
  
  const columnMap = detectWiLineColumns(headerFields);
  
  if (!columnMap) {
    console.warn('[WiLine] Could not detect column mapping');
    return [];
  }
  
  const rows: WiLineParsedRow[] = [];
  let skippedNotDemarrage = 0;
  let skippedTotaux = 0;
  
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const rowIndex = i - headerIndex - 1;
    const rawData = parseCsvLine(lines[i], separator);
    
    // Skip empty rows
    if (!rawData.some(cell => cell.trim())) continue;
    
    // Log first few rows for debugging
    if (rowIndex < 3) {
      console.log(`[WiLine-DEBUG] Row ${rowIndex} raw:`, rawData.slice(0, 8));
    }
    
    // Extract values based on column map
    const dateStr = rawData[columnMap.date] || '';
    const timeStr = columnMap.time >= 0 ? rawData[columnMap.time] || '' : '';
    const typeRaw = columnMap.type >= 0 ? rawData[columnMap.type] || '' : '';
    const selection = columnMap.selection >= 0 ? rawData[columnMap.selection] || '' : '';
    const description = columnMap.description >= 0 ? rawData[columnMap.description] || '' : '';
    const piece = columnMap.piece >= 0 ? parseFrenchNumber(rawData[columnMap.piece]) : 0;
    const billet = columnMap.billet >= 0 ? parseFrenchNumber(rawData[columnMap.billet]) : 0;
    const carteBancaire = columnMap.carteBancaire >= 0 ? parseFrenchNumber(rawData[columnMap.carteBancaire]) : 0;
    const fidelite = columnMap.fidelite >= 0 ? parseFrenchNumber(rawData[columnMap.fidelite]) : 0;
    const prix = columnMap.prix >= 0 ? parseFrenchNumber(rawData[columnMap.prix]) : 0;
    const inseree = columnMap.inseree >= 0 ? parseFrenchNumber(rawData[columnMap.inseree]) : 0;
    const rendue = columnMap.rendue >= 0 ? parseFrenchNumber(rawData[columnMap.rendue]) : 0;
    
    // Skip TOTAUX rows
    if (isTotauxRow(description)) {
      skippedTotaux++;
      continue;
    }
    
    // CRITICAL: Only import "Démarrage" rows for revenue
    const revenueIncluded = isRevenueRow(typeRaw);
    if (!revenueIncluded) {
      skippedNotDemarrage++;
      continue; // Skip non-Démarrage rows entirely
    }
    
    // Parse date and time
    const date_iso = parseWiLineDate(dateStr);
    const time = parseWiLineTime(timeStr);
    
    // Log first parsed row
    if (rowIndex < 3) {
      console.log(`[WiLine-DEBUG] Row ${rowIndex} parsed:`, {
        date: date_iso,
        time,
        type: typeRaw,
        selection,
        description,
        prix,
        piece,
        billet,
        carteBancaire
      });
    }
    
    // Normalize payment
    const payment = normalizeWiLinePayment(piece, billet, carteBancaire, fidelite, prix);
    
    // Determine operation type from description
    const operationType = detectOperationType(description);
    
    // Build metadata
    const metadata_raw: Record<string, unknown> = {
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
    
    // Use description for machine name (e.g., "Séchoirs 13kg", "Machines 12kg")
    // Use selection for machine number (e.g., "22", "17")
    const machineDisplay = description.trim() ? `${selection} - ${description.trim()}` : selection;
    
    rows.push({
      // Base MultiCsvParsedRow fields
      source_file_name: filename,
      row_index_in_file: rowIndex,
      date_iso,
      time,
      normalized_mode: payment.mode === 'MIX' ? 'CB' : (payment.mode as NormalizedPaymentMode | null),
      amount_cents: prixCents,
      machine: machineDisplay || null,
      program: operationType || null,
      raw_data: rawData,
      inserted_cents: insereeCents,
      price_cents: prixCents,
      change_cents: rendueCents,
      machine_name: machineDisplay || null,
      detected_type: 'wiline' as any,
      status,
      errors,
      selected: status === 'importable',
      
      // WiLine specific
      provider: 'wiline',
      external_id: `wiline:${date_iso}:${time}:${selection}`,
      transaction_no: `${date_iso}:${time}:${selection}`,
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
  
  console.log('[WiLine-DEBUG] Parse complete:', {
    totalImported: rows.length,
    skippedNotDemarrage,
    skippedTotaux,
  });
  
  if (rows.length > 0) {
    console.log('[WiLine-DEBUG] First row:', rows[0]);
  }
  
  return rows;
}
