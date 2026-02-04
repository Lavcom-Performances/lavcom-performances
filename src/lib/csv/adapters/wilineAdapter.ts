/**
 * TAEX-245: Wi-Line CSV Adapter
 * 
 * Parses Wi-Line provider CSV files to canonical transaction schema.
 * 
 * BUSINESS RULES:
 * - CA = only Type="Démarrage" rows
 * - Fidélité (FI) = loyalty credit usage, counts in CA, stored in PRIX_FI
 * - Products: Lessive/Détachant/Assouplissant → dedicated types
 * 
 * FORMAT:
 * Headers: Date/Heure(Europe/Paris);;Type;Selection;Description;Pièce;Billet;Carte bancaire;Fidélitée;Prix;Insérée;Rendue
 */

import { 
  CsvAdapter, 
  CanonicalTransaction, 
  SiteProviderConfig, 
  TransactionCategory,
  enforceBusinessInvariants 
} from './types';
import { NormalizedPaymentMode } from '../normalizePaymentMode';
import { normalizeCsvText, detectSeparator, parseCsvLine } from '../normalizeCsvText';

/**
 * Wi-Line specific header patterns
 */
const WILINE_HEADER_PATTERNS = {
  dateHeure: /date.*heure/i,
  carteBancaire: /carte\s*bancaire/i,
  fidelite: /fid[ée]lit[ée]e?/i,
  prix: /^prix$/i,
  inseree: /ins[ée]r[ée]e/i,
};

/**
 * Wi-Line column mapping
 */
interface WiLineColumnMap {
  date: number;
  time: number;
  type: number;
  selection: number;
  description: number;
  piece: number;
  billet: number;
  carteBancaire: number;
  fidelite: number;
  prix: number;
  inseree: number;
  rendue: number;
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
 * Convert euros to cents
 */
function eurosToCents(euros: number): number {
  return Math.round(euros * 100);
}

/**
 * Parse Wi-Line date (DD/MM/YYYY)
 */
function parseWiLineDate(dateStr: string): string | null {
  if (!dateStr?.trim()) return null;
  const match = dateStr.trim().match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return null;
}

/**
 * Parse Wi-Line time (HH:MM:SS)
 */
function parseWiLineTime(timeStr: string): string | null {
  if (!timeStr?.trim()) return null;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (match) {
    const [, hour, minute] = match;
    return `${hour.padStart(2, '0')}:${minute}`;
  }
  return null;
}

/**
 * Detect operation category from description
 */
function detectCategory(description: string): TransactionCategory {
  if (!description) return 'OTHER';
  const lower = description.toLowerCase();
  
  if (lower.includes('lave') && lower.includes('linge')) return 'LAVE_LINGE';
  if (lower.includes('machine') && !lower.includes('séchoir')) return 'LAVE_LINGE';
  if (lower.includes('séchoir') || lower.includes('sechoir') || lower.includes('seche')) return 'SECHE_LINGE';
  if (lower.includes('lessive')) return 'LESSIVE';
  if (lower.includes('détachant') || lower.includes('detachant')) return 'DETACHANT';
  if (lower.includes('assouplissant')) return 'ASSOUPLISSANT';
  
  return 'CYCLE';
}

/**
 * Build display label from Wi-Line data
 * Uses Description (preferred) or Selection as fallback
 */
function buildDisplayLabel(description: string, selection: string): string {
  // Prefer Description (e.g., "Séchoirs 13kg", "Machines 12kg")
  if (description?.trim()) {
    // If we have both selection and description, combine them
    if (selection?.trim()) {
      return `${selection} - ${description.trim()}`;
    }
    return description.trim();
  }
  
  // Fallback to selection number
  if (selection?.trim()) {
    return `Machine ${selection}`;
  }
  
  return 'Opération inconnue';
}

/**
 * Determine payment mode and breakdown from Wi-Line columns
 */
function normalizePayment(
  piece: number,
  billet: number,
  carteBancaire: number,
  fidelite: number,
  prixTotal: number
): {
  mode: NormalizedPaymentMode | null;
  price_cb_cents: number;
  price_esp_cents: number;
  price_fi_cents: number;
  is_mixed: boolean;
} {
  const cashPaid = (piece + billet) > 0;
  const cardPaid = carteBancaire > 0;
  const creditUsed = fidelite > 0;
  const prixCents = eurosToCents(prixTotal);
  
  const activeCount = [cashPaid, cardPaid, creditUsed].filter(Boolean).length;
  
  // Single payment method
  if (activeCount === 1) {
    if (creditUsed) {
      return {
        mode: 'FI',
        price_cb_cents: 0,
        price_esp_cents: 0,
        price_fi_cents: prixCents,
        is_mixed: false,
      };
    }
    if (cashPaid) {
      return {
        mode: 'ESP',
        price_cb_cents: 0,
        price_esp_cents: prixCents,
        price_fi_cents: 0,
        is_mixed: false,
      };
    }
    if (cardPaid) {
      return {
        mode: 'CB',
        price_cb_cents: prixCents,
        price_esp_cents: 0,
        price_fi_cents: 0,
        is_mixed: false,
      };
    }
  }
  
  // Mixed payment - allocate to CB if card was used, else ESP
  if (activeCount > 1) {
    if (cardPaid) {
      return {
        mode: 'MIX',
        price_cb_cents: prixCents,
        price_esp_cents: 0,
        price_fi_cents: 0,
        is_mixed: true,
      };
    }
    return {
      mode: 'MIX',
      price_cb_cents: 0,
      price_esp_cents: prixCents,
      price_fi_cents: 0,
      is_mixed: true,
    };
  }
  
  // No payment detected but price > 0
  if (prixTotal > 0) {
    return {
      mode: null,
      price_cb_cents: 0,
      price_esp_cents: prixCents,
      price_fi_cents: 0,
      is_mixed: false,
    };
  }
  
  return {
    mode: null,
    price_cb_cents: 0,
    price_esp_cents: 0,
    price_fi_cents: 0,
    is_mixed: false,
  };
}

/**
 * Check if row is a TOTAUX summary line
 */
function isTotauxRow(description: string): boolean {
  return description?.toUpperCase().includes('TOTAUX') ?? false;
}

/**
 * Check if row counts towards revenue (Type="Démarrage")
 */
function isRevenueRow(type: string): boolean {
  if (!type) return false;
  const lower = type.toLowerCase().trim();
  return lower === 'démarrage' || lower === 'demarrage';
}

/**
 * Detect Wi-Line column positions from headers
 */
function detectColumns(headers: string[]): WiLineColumnMap | null {
  const findColumn = (patterns: (string | RegExp)[]): number => {
    return headers.findIndex(h => {
      const lower = h.toLowerCase().trim();
      return patterns.some(p => {
        if (typeof p === 'string') return lower.includes(p) || lower === p;
        return p.test(lower);
      });
    });
  };

  const map: WiLineColumnMap = {
    date: findColumn([/date.*heure/i, 'date/heure', 'date']),
    time: -1,
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

  // Wi-Line special case: first col is date, second col (empty header) is time
  if (map.date === 0 && headers[1] === '') {
    map.time = 1;
  }

  // Validate minimum required columns
  if (map.date === -1 || map.prix === -1) {
    return null;
  }

  return map;
}

/**
 * Wi-Line CSV Adapter
 */
export const wilineAdapter: CsvAdapter = {
  provider: 'wiline',
  displayName: 'Wi-Line',
  
  detectFormat(headers: string[]): number {
    const headersStr = headers.join('|').toLowerCase();
    
    const hasDateHeure = WILINE_HEADER_PATTERNS.dateHeure.test(headersStr);
    const hasCarteBancaire = WILINE_HEADER_PATTERNS.carteBancaire.test(headersStr);
    const hasFidelite = WILINE_HEADER_PATTERNS.fidelite.test(headersStr);
    const hasPrix = headers.some(h => WILINE_HEADER_PATTERNS.prix.test(h.toLowerCase().trim()));
    const hasInseree = WILINE_HEADER_PATTERNS.inseree.test(headersStr);
    
    const matches = [hasDateHeure, hasCarteBancaire, hasFidelite, hasPrix, hasInseree].filter(Boolean).length;
    
    // Require at least 4 of 5 patterns for high confidence
    if (matches >= 4) return 0.95;
    if (matches >= 3) return 0.7;
    if (matches >= 2) return 0.4;
    
    return 0;
  },
  
  getExpectedHeaders(): string[] {
    return [
      'Date/Heure(Europe/Paris)',
      'Type',
      'Selection',
      'Description',
      'Pièce',
      'Billet',
      'Carte bancaire',
      'Fidélitée',
      'Prix',
      'Insérée',
      'Rendue',
    ];
  },
  
  parse(filename: string, content: string, config: SiteProviderConfig): CanonicalTransaction[] {
    const normalized = normalizeCsvText(content);
    const separator = detectSeparator(normalized);
    const lines = normalized.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) return [];
    
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
    const columnMap = detectColumns(headerFields);
    
    if (!columnMap) {
      console.warn('[WiLine Adapter] Could not detect column mapping');
      return [];
    }
    
    const transactions: CanonicalTransaction[] = [];
    
    for (let i = headerIndex + 1; i < lines.length; i++) {
      const rowIndex = i - headerIndex - 1;
      const rawData = parseCsvLine(lines[i], separator);
      
      if (!rawData.some(cell => cell.trim())) continue;
      
      // Extract values
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
      if (isTotauxRow(description)) continue;
      
      // Only process Démarrage rows for revenue
      const revenueIncluded = isRevenueRow(typeRaw);
      if (!revenueIncluded) continue;
      
      // Parse date/time
      const date_local = parseWiLineDate(dateStr);
      const time_local = parseWiLineTime(timeStr);
      
      // Build occurred_at
      let occurred_at: Date | null = null;
      if (date_local) {
        const dateTimeStr = time_local ? `${date_local}T${time_local}:00` : `${date_local}T00:00:00`;
        occurred_at = new Date(dateTimeStr);
        if (isNaN(occurred_at.getTime())) occurred_at = null;
      }
      
      // Normalize payment
      const payment = normalizePayment(piece, billet, carteBancaire, fidelite, prix);
      
      // Build display label (stable, using Description)
      const displayLabel = buildDisplayLabel(description, selection);
      
      // Detect category
      const category = detectCategory(description);
      
      // Validation
      const errors: string[] = [];
      const warnings: string[] = [];
      let status: 'importable' | 'to_review' | 'invalid' = 'importable';
      
      if (!date_local) {
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
      
      if (payment.is_mixed) {
        warnings.push('Paiement mixte détecté - traité en CB');
      }
      
      const tx: CanonicalTransaction = {
        source_file_name: filename,
        row_index_in_file: rowIndex,
        provider: 'wiline',
        occurred_at,
        date_local,
        time_local,
        display_label: displayLabel,
        machine_label: description.trim() || null,
        category,
        payment_mode: payment.mode === 'MIX' ? 'CB' : payment.mode,
        inserted_cents: payment.mode === 'ESP' && inseree > 0 ? eurosToCents(inseree) : null,
        price_cents: eurosToCents(prix),
        change_cents: payment.mode === 'ESP' && rendue > 0 ? eurosToCents(rendue) : null,
        price_cb_cents: payment.price_cb_cents,
        price_esp_cents: payment.price_esp_cents,
        price_fi_cents: payment.price_fi_cents,
        revenue_included: true,
        raw_source_id: selection || null,
        raw_payload: {
          selection,
          description,
          type: typeRaw,
          piece,
          billet,
          carte_bancaire: carteBancaire,
          fidelite,
          inseree,
          rendue,
          display_label_source: 'description',
        },
        validation_status: status,
        validation_errors: errors,
        validation_warnings: warnings,
        selected: status === 'importable',
      };
      
      // Enforce business invariants
      enforceBusinessInvariants(tx);
      
      transactions.push(tx);
    }
    
    return transactions;
  },
};

export default wilineAdapter;
