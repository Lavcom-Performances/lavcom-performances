/**
 * TAEX-245: LM Control CSV Adapter
 * 
 * Parses LM Control (Events) CSV files to canonical transaction schema.
 * 
 * BUSINESS RULES:
 * - Only "vend" type rows are transactions
 * - Payment mode inferred from columns or explicit payment_mode field
 * - Price is the transaction amount
 * 
 * FORMAT:
 * Headers: id,type,name,payment_mode,amount,price,change,detail,date
 */

import { 
  CsvAdapter, 
  CanonicalTransaction, 
  SiteProviderConfig, 
  TransactionCategory,
  enforceBusinessInvariants 
} from './types';
import { NormalizedPaymentMode, normalizePaymentMode } from '../normalizePaymentMode';
import { normalizeCsvText, detectSeparator, parseCsvLine } from '../normalizeCsvText';

/**
 * LM Control header detection patterns
 */
const LMCONTROL_REQUIRED_HEADERS = ['id', 'type', 'payment_mode', 'date', 'price'];

/**
 * LM Control column mapping
 */
interface LMControlColumnMap {
  id: number;
  type: number;
  name: number;
  payment_mode: number;
  amount: number;
  price: number;
  change: number;
  detail: number;
  date: number;
}

/**
 * Parse integer from string
 */
function parseIntSafe(value: string | undefined): number {
  if (!value || value.trim() === '') return 0;
  const num = parseInt(value.trim(), 10);
  return isNaN(num) ? 0 : num;
}

/**
 * Parse date string to components
 * Handles ISO format: YYYY-MM-DD HH:MM:SS or DD/MM/YYYY HH:MM:SS
 */
function parseDateString(dateStr: string): { date: string | null; time: string | null } {
  if (!dateStr?.trim()) return { date: null, time: null };
  
  const trimmed = dateStr.trim();
  
  // Try ISO format first
  const isoDate = new Date(trimmed);
  if (!isNaN(isoDate.getTime())) {
    const date = isoDate.toISOString().split('T')[0];
    const hours = isoDate.getHours().toString().padStart(2, '0');
    const minutes = isoDate.getMinutes().toString().padStart(2, '0');
    return { date, time: `${hours}:${minutes}` };
  }
  
  // Try French format: DD/MM/YYYY HH:MM:SS
  const frenchMatch = trimmed.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})\s*(\d{1,2})?:?(\d{2})?:?(\d{2})?$/);
  if (frenchMatch) {
    const [, day, month, year, hour = '0', min = '0'] = frenchMatch;
    const date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    const time = `${hour.padStart(2, '0')}:${min.padStart(2, '0')}`;
    return { date, time };
  }
  
  return { date: null, time: null };
}

/**
 * Detect operation category from name/description
 */
function detectCategory(name: string): TransactionCategory {
  if (!name) return 'OTHER';
  const lower = name.toLowerCase();
  
  if (lower.includes('lave') && lower.includes('linge')) return 'LAVE_LINGE';
  if (lower.includes('machine')) return 'LAVE_LINGE';
  if (lower.includes('séchoir') || lower.includes('sechoir') || lower.includes('seche')) return 'SECHE_LINGE';
  if (lower.includes('lessive')) return 'LESSIVE';
  if (lower.includes('détachant') || lower.includes('detachant')) return 'DETACHANT';
  if (lower.includes('assouplissant')) return 'ASSOUPLISSANT';
  
  return 'CYCLE';
}

/**
 * Build display label from LM Control data
 * Uses name (preferred) as the display label
 */
function buildDisplayLabel(name: string, id: string): string {
  // Use name/label directly - this is the stable label
  if (name?.trim()) {
    return name.trim();
  }
  
  // Fallback to a descriptive label (not the raw ID)
  return 'Opération';
}

/**
 * Detect LM Control columns from headers
 */
function detectColumns(headers: string[]): LMControlColumnMap | null {
  const headersLower = headers.map(h => h.toLowerCase().trim());
  
  const findColumn = (names: string[]): number => {
    return headersLower.findIndex(h => names.some(n => h === n || h.includes(n)));
  };

  const map: LMControlColumnMap = {
    id: findColumn(['id']),
    type: findColumn(['type']),
    name: findColumn(['name', 'nom', 'label']),
    payment_mode: findColumn(['payment_mode', 'mode', 'paiement']),
    amount: findColumn(['amount', 'montant', 'inserted']),
    price: findColumn(['price', 'prix']),
    change: findColumn(['change', 'rendu']),
    detail: findColumn(['detail', 'détail']),
    date: findColumn(['date', 'datetime']),
  };

  // Validate minimum required columns
  if (map.date === -1 || map.price === -1) {
    return null;
  }

  return map;
}

/**
 * Normalize payment mode from raw string
 */
function normalizeLMControlPaymentMode(mode: string): NormalizedPaymentMode | null {
  if (!mode) return null;
  
  const normalized = mode.toLowerCase().trim();
  
  // Direct mappings
  if (normalized === 'cb' || normalized === 'carte' || normalized === 'card') return 'CB';
  if (normalized === 'esp' || normalized === 'espece' || normalized === 'espèce' || 
      normalized === 'especes' || normalized === 'espèces' || normalized === 'cash') return 'ESP';
  if (normalized === 'fi' || normalized === 'fidelite' || normalized === 'fidélité' || 
      normalized === 'loyalty' || normalized === 'free' || normalized === 'gratuit') return 'FI';
  
  // Use central normalizer as fallback
  return normalizePaymentMode(mode);
}

/**
 * LM Control CSV Adapter
 */
export const lmControlAdapter: CsvAdapter = {
  provider: 'lmcontrol',
  displayName: 'LM Control',
  
  detectFormat(headers: string[]): number {
    const headersLower = headers.map(h => h.toLowerCase().trim());
    
    // Check for Events format specific headers
    const hasId = headersLower.includes('id');
    const hasType = headersLower.includes('type');
    const hasPaymentMode = headersLower.some(h => h.includes('payment_mode') || h === 'mode');
    const hasDate = headersLower.includes('date') || headersLower.some(h => h.includes('datetime'));
    const hasPrice = headersLower.includes('price') || headersLower.includes('prix');
    
    const matches = [hasId, hasType, hasPaymentMode, hasDate, hasPrice].filter(Boolean).length;
    
    if (matches >= 4) return 0.9;
    if (matches >= 3) return 0.6;
    if (matches >= 2) return 0.3;
    
    return 0;
  },
  
  getExpectedHeaders(): string[] {
    return ['id', 'type', 'name', 'payment_mode', 'amount', 'price', 'change', 'detail', 'date'];
  },
  
  parse(filename: string, content: string, config: SiteProviderConfig): CanonicalTransaction[] {
    const normalized = normalizeCsvText(content);
    const lines = normalized.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) return [];
    
    // Find header line (skip preamble like "Events")
    let headerIndex = -1;
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const line = lines[i].toLowerCase().trim();
      if (!line || line === 'events') continue;
      
      // Check for Events format headers
      if (line.includes('id') && line.includes('type') && 
          (line.includes('payment_mode') || line.includes('mode')) && line.includes('date')) {
        headerIndex = i;
        break;
      }
    }
    
    if (headerIndex === -1) {
      console.warn('[LM Control Adapter] Header line not found');
      return [];
    }
    
    const headerLine = lines[headerIndex];
    const separator = headerLine.includes(';') ? ';' : ',';
    const headerFields = parseCsvLine(headerLine, separator);
    
    const columnMap = detectColumns(headerFields);
    
    if (!columnMap) {
      console.warn('[LM Control Adapter] Could not detect column mapping');
      return [];
    }
    
    const transactions: CanonicalTransaction[] = [];
    
    for (let i = headerIndex + 1; i < lines.length; i++) {
      const rowIndex = i - headerIndex - 1;
      const line = lines[i].trim();
      if (!line) continue;
      
      const rawData = parseCsvLine(line, separator);
      
      // Extract values
      const id = columnMap.id >= 0 ? rawData[columnMap.id]?.trim() || '' : '';
      const type = columnMap.type >= 0 ? rawData[columnMap.type]?.toLowerCase()?.trim() || '' : '';
      const name = columnMap.name >= 0 ? rawData[columnMap.name]?.trim() || '' : '';
      const paymentModeRaw = columnMap.payment_mode >= 0 ? rawData[columnMap.payment_mode]?.trim() || '' : '';
      const amountCentimes = columnMap.amount >= 0 ? parseIntSafe(rawData[columnMap.amount]) : 0;
      const priceCentimes = columnMap.price >= 0 ? parseIntSafe(rawData[columnMap.price]) : 0;
      const changeCentimes = columnMap.change >= 0 ? parseIntSafe(rawData[columnMap.change]) : 0;
      const dateStr = columnMap.date >= 0 ? rawData[columnMap.date]?.trim() || '' : '';
      
      // Only process "vend" (sale) type transactions
      if (type !== 'vend') continue;
      
      // Parse date/time
      const { date: date_local, time: time_local } = parseDateString(dateStr);
      
      // Build occurred_at
      let occurred_at: Date | null = null;
      if (date_local) {
        const dateTimeStr = time_local ? `${date_local}T${time_local}:00` : `${date_local}T00:00:00`;
        occurred_at = new Date(dateTimeStr);
        if (isNaN(occurred_at.getTime())) occurred_at = null;
      }
      
      // Normalize payment mode
      const payment_mode = normalizeLMControlPaymentMode(paymentModeRaw);
      
      // Calculate payment breakdown
      let price_cb_cents = 0;
      let price_esp_cents = 0;
      let price_fi_cents = 0;
      
      if (payment_mode === 'CB') {
        price_cb_cents = priceCentimes;
      } else if (payment_mode === 'ESP') {
        price_esp_cents = priceCentimes;
      } else if (payment_mode === 'FI') {
        price_fi_cents = priceCentimes;
      }
      
      // Build display label (stable, using name)
      const displayLabel = buildDisplayLabel(name, id);
      
      // Detect category
      const category = detectCategory(name);
      
      // Validation
      const errors: string[] = [];
      const warnings: string[] = [];
      let status: 'importable' | 'to_review' | 'invalid' = 'importable';
      
      if (!date_local) {
        errors.push(`Date invalide: "${dateStr}"`);
        status = 'invalid';
      }
      
      if (priceCentimes <= 0) {
        errors.push(`Prix invalide: ${priceCentimes}`);
        status = 'invalid';
      }
      
      if (!payment_mode) {
        errors.push(`Mode de paiement invalide: "${paymentModeRaw}"`);
        status = 'to_review';
      }
      
      const tx: CanonicalTransaction = {
        source_file_name: filename,
        row_index_in_file: rowIndex,
        provider: 'lmcontrol',
        occurred_at,
        date_local,
        time_local,
        display_label: displayLabel,
        machine_label: name || null,
        category,
        payment_mode,
        inserted_cents: payment_mode === 'ESP' && amountCentimes > 0 ? amountCentimes : null,
        price_cents: priceCentimes,
        change_cents: payment_mode === 'ESP' && changeCentimes > 0 ? changeCentimes : null,
        price_cb_cents,
        price_esp_cents,
        price_fi_cents,
        revenue_included: true,
        raw_source_id: id || null,
        raw_payload: {
          id,
          type,
          name,
          payment_mode: paymentModeRaw,
          amount: amountCentimes,
          price: priceCentimes,
          change: changeCentimes,
          display_label_source: 'name',
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

export default lmControlAdapter;
