/**
 * Multi-CSV parsing and validation
 */

import { normalizeCsvText, detectSeparator, parseCsvLine } from './normalizeCsvText';
import { normalizePaymentMode, PAYMENT_MODES_ACCEPTED } from './normalizePaymentMode';
import { parseAmountToCents, getAmountFromColumns } from './parseAmount';
import { MultiCsvParsedRow, MAX_PREVIEW_ROWS_PER_FILE, CsvFormatType } from './multiCsvTypes';
import { isWiLineFormat, parseWiLineCsvFile } from './parseWiLine';

/**
 * Check if this is LM Control format based on headers
 * LM Control format has: Date/Heure, Type, Selection, Description, Pièce, Billet, Carte bancaire, etc.
 */
function isLmControlFormat(headers: string[]): boolean {
  const headerLower = headers.map(h => h.toLowerCase());
  // Check for characteristic LM Control columns
  const hasDateHeure = headerLower.some(h => h.includes('date') && h.includes('heure'));
  // Match "pièce" with various accent combinations: piece, pièce, piéce, etc.
  const hasPiece = headerLower.some(h => /^pi[eèéê]ce$/i.test(h) || h === 'piece' || h.includes('pièce'));
  const hasBillet = headerLower.some(h => /^billets?$/i.test(h));
  const hasCarteBancaire = headerLower.some(h => 
    (h.includes('carte') && h.includes('bancaire')) || 
    h === 'cb' || 
    /carte\s*bancaire/i.test(h)
  );
  const hasPrix = headerLower.some(h => /^prix$/i.test(h));
  const hasInseree = headerLower.some(h => /ins[eéè]r[eéè]e?/i.test(h) || h.includes('insérée'));
  const hasRendue = headerLower.some(h => /rendu[eé]?/i.test(h));
  
  // LM Control typically has: 
  // - Date/Heure combined header AND payment columns OR
  // - Payment columns (Pièce, Billet, Carte bancaire) with Prix/Insérée
  const hasPaymentColumns = (hasPiece || hasBillet || hasCarteBancaire);
  const hasAmountColumns = (hasPrix || hasInseree);
  
  return (hasDateHeure && hasPaymentColumns) || (hasPaymentColumns && hasAmountColumns && hasRendue);
}

/**
 * Detect CSV format type from headers and content
 */
function detectCsvFormat(headers: string[], columnMap: Record<string, number>): CsvFormatType {
  const headerLower = headers.map(h => h.toLowerCase());
  
  // WiLine format: has specific WiLine headers
  // Check this FIRST before other formats
  if (isWiLineFormat(headers)) {
    return 'wiline';
  }
  
  // LM Control format: has specific payment columns (Pièce, Billet, Carte bancaire)
  if (isLmControlFormat(headers)) {
    return 'lm_control';
  }
  
  // Events format: has 'type' column and specific Events headers
  if (columnMap.type !== undefined) {
    return 'events';
  }
  
  // Standard format: has basic date, amount, payment columns
  if (columnMap.date !== undefined && (columnMap.price !== undefined || columnMap.amount !== undefined)) {
    return 'standard';
  }
  
  return 'unknown';
}

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
    // Date patterns - include combined date/time headers
    date: [/^date$/i, /^datetime$/i, /^jour$/i, /^day$/i, /date.*heure/i, /date.*time/i],
    time: [/^time$/i, /^heure$/i, /^hour$/i],
    payment_mode: [/^payment_mode$/i, /^mode$/i, /^paiement$/i, /^payment$/i, /^type_paiement$/i],
    // Price patterns - "Prix" column in LM Control format
    price: [/^price$/i, /^prix$/i, /^montant$/i, /^amount$/i],
    // Amount inserted patterns - "Insérée" column (with accent variations)
    amount: [/^amount$/i, /^insere$/i, /^inserted$/i, /^ins[eéè]r[eéè]e?$/i, /insérée/i, /inseree/i],
    // Change patterns - "Rendue" column (with accent variations)
    change: [/^change$/i, /^rendu$/i, /^returned$/i, /^rendue$/i, /rendu[eé]?/i],
    // Machine patterns - "Selection" column for machine ID
    machine: [/^machine$/i, /^name$/i, /^nom$/i, /^appareil$/i, /^selection$/i, /^s[ée]lection$/i],
    // Program patterns - "Description" column for machine type
    program: [/^program$/i, /^programme$/i, /^cycle$/i, /^detail$/i, /^description$/i],
    // Type patterns
    type: [/^type$/i],
    // Cash amount - "Pièce" + "Billet" columns (with accent variations)
    coin: [/^pi[eèé]ce$/i, /^coin$/i, /^pieces?$/i],
    bill: [/^billet$/i, /^bill$/i, /^billets?$/i],
    // Card amount - "Carte bancaire" column
    card: [/^carte$/i, /^card$/i, /^carte.?bancaire$/i, /^cb$/i, /carte\s*bancaire/i],
    // Loyalty amount - "Fidélitée" column
    loyalty: [/^fid[ée]lit[ée]e?$/i, /^loyalty$/i],
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
  
  // Detect CSV format
  const detectedFormat = detectCsvFormat(headers, columnMap);
  
  // For LM Control format: if we have "date/heure" in first column and empty second column,
  // the second column is the time column (hh:mm:ss format)
  if (detectedFormat === 'lm_control' && columnMap.date === 0 && headers[1] === '') {
    columnMap.time = 1;
  }
  
  // Route to WiLine parser if detected
  if (detectedFormat === 'wiline') {
    return parseWiLineCsvFile(filename, content);
  }
  
  const isEventsFormat = detectedFormat === 'events';
  const isLmControl = detectedFormat === 'lm_control';
  
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
    
    // For LM Control format, skip non-"Démarrage" rows (only machine starts, not rechargement)
    if (isLmControl && columnMap.type !== undefined) {
      const type = rawData[columnMap.type]?.trim()?.toLowerCase() || '';
      if (type !== 'démarrage' && type !== 'demarrage') continue;
    }
    
    // Parse fields
    const dateStr = columnMap.date !== undefined ? rawData[columnMap.date] : '';
    const timeStr = columnMap.time !== undefined ? rawData[columnMap.time] : '';
    let modeStr = columnMap.payment_mode !== undefined ? rawData[columnMap.payment_mode] : '';
    const machineStr = columnMap.machine !== undefined ? rawData[columnMap.machine] : '';
    const programStr = columnMap.program !== undefined ? rawData[columnMap.program] : '';
    
    // For LM Control format: detect payment mode from numeric columns
    // Columns: Pièce, Billet = ESP (cash), Carte bancaire = CB
    if (isLmControl && !modeStr) {
      const coinValue = columnMap.coin !== undefined ? parseFloat((rawData[columnMap.coin] || '0').replace(',', '.')) : 0;
      const billValue = columnMap.bill !== undefined ? parseFloat((rawData[columnMap.bill] || '0').replace(',', '.')) : 0;
      const cardValue = columnMap.card !== undefined ? parseFloat((rawData[columnMap.card] || '0').replace(',', '.')) : 0;
      const loyaltyValue = columnMap.loyalty !== undefined ? parseFloat((rawData[columnMap.loyalty] || '0').replace(',', '.')) : 0;
      
      // Determine primary payment mode based on which column has a value
      if (cardValue > 0) {
        modeStr = 'CB';
      } else if (coinValue > 0 || billValue > 0) {
        modeStr = 'ESP';
      } else if (loyaltyValue > 0) {
        modeStr = 'FIDELITE';
      }
    }
    
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
      detected_type: detectedFormat,
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
