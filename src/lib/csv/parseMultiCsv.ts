/**
 * Multi-CSV parsing and validation
 */

import { normalizeCsvText, detectSeparator, parseCsvLine } from './normalizeCsvText';
import { normalizePaymentMode, PAYMENT_MODES_ACCEPTED } from './normalizePaymentMode';
import { parseAmountToCents, getAmountFromColumns } from './parseAmount';
import { MultiCsvParsedRow, MAX_PREVIEW_ROWS_PER_FILE } from './multiCsvTypes';

/**
 * Parse date string to ISO format
 */
function parseDateToIso(dateStr: string): string | null {
  if (!dateStr || !dateStr.trim()) return null;
  
  const trimmed = dateStr.trim();
  
  // Try ISO format first
  const isoDate = new Date(trimmed);
  if (!isNaN(isoDate.getTime())) {
    return isoDate.toISOString().split('T')[0];
  }
  
  // French format: DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const frenchMatch = trimmed.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
  if (frenchMatch) {
    const [, day, month, year] = frenchMatch;
    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }
  
  // European format with time: DD/MM/YYYY HH:MM
  const euroWithTime = trimmed.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})\s+\d{1,2}:\d{2}/);
  if (euroWithTime) {
    const [, day, month, year] = euroWithTime;
    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }
  
  return null;
}

/**
 * Extract time from date string
 */
function extractTime(dateStr: string): string | null {
  if (!dateStr) return null;
  
  // Look for time pattern HH:MM or HH:MM:SS
  const timeMatch = dateStr.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (timeMatch) {
    const [, hours, minutes] = timeMatch;
    return `${hours.padStart(2, '0')}:${minutes}`;
  }
  
  return null;
}

/**
 * Detect column mapping from headers
 */
function detectColumnMapping(headers: string[]): Record<string, number> {
  const mapping: Record<string, number> = {};
  
  const patterns: Record<string, RegExp[]> = {
    date: [/^date$/i, /^datetime$/i, /^jour$/i, /^day$/i],
    time: [/^time$/i, /^heure$/i, /^hour$/i],
    payment_mode: [/^payment_mode$/i, /^mode$/i, /^paiement$/i, /^payment$/i, /^type_paiement$/i],
    price: [/^price$/i, /^prix$/i, /^montant$/i, /^amount$/i],
    amount: [/^amount$/i, /^insere$/i, /^inserted$/i],
    change: [/^change$/i, /^rendu$/i, /^returned$/i],
    machine: [/^machine$/i, /^name$/i, /^nom$/i, /^appareil$/i],
    program: [/^program$/i, /^programme$/i, /^cycle$/i, /^detail$/i],
    type: [/^type$/i],
  };
  
  headers.forEach((header, index) => {
    const normalized = header.toLowerCase().trim();
    
    for (const [key, regexList] of Object.entries(patterns)) {
      if (mapping[key] === undefined) {
        for (const regex of regexList) {
          if (regex.test(normalized)) {
            mapping[key] = index;
            break;
          }
        }
      }
    }
  });
  
  return mapping;
}

/**
 * Parse a single CSV file to MultiCsvParsedRow[]
 */
export function parseMultiCsvFile(
  filename: string,
  content: string
): MultiCsvParsedRow[] {
  const normalized = normalizeCsvText(content);
  const separator = detectSeparator(normalized);
  const lines = normalized.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    return [];
  }
  
  // Find header line (skip preamble like "Events")
  let headerIndex = 0;
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const fields = parseCsvLine(lines[i], separator);
    // A header line typically has multiple fields with text
    if (fields.length >= 3 && fields.some(f => /[a-zA-Z]/.test(f))) {
      headerIndex = i;
      break;
    }
  }
  
  const headers = parseCsvLine(lines[headerIndex], separator).map(h => h.toLowerCase().trim());
  const columnMap = detectColumnMapping(headers);
  
  // Check if this is Events format (has type column with 'vend' values)
  const isEventsFormat = columnMap.type !== undefined;
  
  const rows: MultiCsvParsedRow[] = [];
  
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const rowIndex = i - headerIndex - 1;
    const rawData = parseCsvLine(lines[i], separator);
    
    if (!rawData.some(cell => cell.trim())) continue;
    
    // For Events format, skip non-vend rows
    if (isEventsFormat) {
      const type = columnMap.type !== undefined ? rawData[columnMap.type]?.toLowerCase()?.trim() : '';
      if (type !== 'vend') continue;
    }
    
    // Parse fields
    const dateStr = columnMap.date !== undefined ? rawData[columnMap.date] : '';
    const timeStr = columnMap.time !== undefined ? rawData[columnMap.time] : '';
    const modeStr = columnMap.payment_mode !== undefined ? rawData[columnMap.payment_mode] : '';
    const machineStr = columnMap.machine !== undefined ? rawData[columnMap.machine] : '';
    const programStr = columnMap.program !== undefined ? rawData[columnMap.program] : '';
    
    // Parse date and time
    const date_iso = parseDateToIso(dateStr);
    const time = timeStr ? extractTime(timeStr) : extractTime(dateStr);
    
    // Normalize payment mode
    const normalized_mode = normalizePaymentMode(modeStr);
    
    // Parse amounts
    const priceStr = columnMap.price !== undefined ? rawData[columnMap.price] : '';
    const amountStr = columnMap.amount !== undefined ? rawData[columnMap.amount] : '';
    const changeStr = columnMap.change !== undefined ? rawData[columnMap.change] : '';
    
    // Get amount from multiple possible columns
    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => { rowObj[h] = rawData[idx] || ''; });
    
    let amount_cents = getAmountFromColumns(rowObj);
    let price_cents = parseAmountToCents(priceStr);
    let inserted_cents = parseAmountToCents(amountStr);
    let change_cents = parseAmountToCents(changeStr);
    
    // Use price as primary amount if available
    if (price_cents !== null && price_cents > 0) {
      amount_cents = price_cents;
    }
    
    // Determine validation status
    const errors: string[] = [];
    let status: 'importable' | 'to_review' | 'invalid' = 'importable';
    
    if (!date_iso) {
      errors.push('Date manquante ou invalide');
      status = 'invalid';
    }
    
    if (!normalized_mode) {
      errors.push(`Mode de paiement invalide: "${modeStr}"`);
      status = 'invalid';
    }
    
    if (amount_cents === null || amount_cents <= 0) {
      if (date_iso && normalized_mode) {
        errors.push('Montant manquant');
        status = 'to_review';
      } else {
        errors.push('Montant invalide');
        if (status !== 'invalid') status = 'invalid';
      }
    }
    
    rows.push({
      source_file_name: filename,
      row_index_in_file: rowIndex,
      date_iso,
      time,
      normalized_mode,
      amount_cents,
      machine: machineStr || null,
      program: programStr || null,
      raw_data: rawData,
      inserted_cents,
      price_cents,
      change_cents,
      machine_name: machineStr || null,
      status,
      errors,
      selected: status === 'importable', // Auto-select importable rows
    });
  }
  
  return rows;
}

/**
 * Get preview rows (limited)
 */
export function getPreviewRows(rows: MultiCsvParsedRow[]): MultiCsvParsedRow[] {
  return rows.slice(0, MAX_PREVIEW_ROWS_PER_FILE);
}
