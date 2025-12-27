/**
 * Parser for "Events" CSV format from payment terminals
 * Format: id,type,name,payment_mode,amount,price,change,detail,date
 * Amounts are in centimes (divide by 100 for euros)
 * Only "vend" type rows are actual sales transactions
 */

import { ParsedRow, ImportSummary } from "./types";

export interface EventsRow {
  id: string;
  type: string;
  name: string;
  payment_mode: string;
  amount: number; // centimes
  price: number; // centimes
  change: number; // centimes
  detail: string;
  date: string; // ISO date string
}

export interface EventsParsedRow extends ParsedRow {
  // Extended fields for Events format
  insertedEur?: number;
  priceEur?: number;
  changeEur?: number;
  machineName?: string;
  source: 'events_csv';
}

/**
 * Detect if CSV text is in "Events" format
 * Events format has specific headers: id,type,name,payment_mode,amount,price,change,detail,date
 */
export function detectEventsFormat(csvText: string): boolean {
  const lines = csvText.trim().split(/\r?\n/);
  
  // Look for the header line (may have preamble lines like "Events" or empty lines)
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i].toLowerCase().trim();
    
    // Skip empty lines or preamble
    if (!line || line === 'events') continue;
    
    // Check for Events format headers
    const requiredHeaders = ['id', 'type', 'payment_mode', 'date', 'price'];
    const hasAllHeaders = requiredHeaders.every(header => 
      line.includes(header)
    );
    
    if (hasAllHeaders) {
      return true;
    }
  }
  
  return false;
}

/**
 * Parse Events CSV format, skipping preamble and extracting data
 * Returns parsed rows ready for import
 */
export function parseEventsCSV(csvText: string): EventsParsedRow[] {
  const lines = csvText.trim().split(/\r?\n/);
  const result: EventsParsedRow[] = [];
  
  // Find header line index
  let headerIndex = -1;
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i].toLowerCase().trim();
    if (line.includes('id') && line.includes('type') && line.includes('payment_mode') && line.includes('date')) {
      headerIndex = i;
      break;
    }
  }
  
  if (headerIndex === -1) {
    console.error('Events CSV: Header line not found');
    return [];
  }
  
  // Parse header
  const headerLine = lines[headerIndex];
  const separator = headerLine.includes(';') ? ';' : ',';
  const headers = parseLine(headerLine, separator).map(h => h.toLowerCase().trim());
  
  // Map header names to indices
  const colIndex = {
    id: headers.indexOf('id'),
    type: headers.indexOf('type'),
    name: headers.indexOf('name'),
    payment_mode: headers.indexOf('payment_mode'),
    amount: headers.indexOf('amount'),
    price: headers.indexOf('price'),
    change: headers.indexOf('change'),
    detail: headers.indexOf('detail'),
    date: headers.indexOf('date'),
  };
  
  // Parse data rows
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = parseLine(line, separator);
    
    // Get raw values
    const type = colIndex.type >= 0 ? values[colIndex.type]?.toLowerCase()?.trim() : '';
    const name = colIndex.name >= 0 ? values[colIndex.name]?.trim() : '';
    const paymentMode = colIndex.payment_mode >= 0 ? values[colIndex.payment_mode]?.trim() : '';
    const amountCentimes = colIndex.amount >= 0 ? parseInt(values[colIndex.amount], 10) : 0;
    const priceCentimes = colIndex.price >= 0 ? parseInt(values[colIndex.price], 10) : 0;
    const changeCentimes = colIndex.change >= 0 ? parseInt(values[colIndex.change], 10) : 0;
    const dateStr = colIndex.date >= 0 ? values[colIndex.date]?.trim() : '';
    
    // Only process "vend" (sale) type transactions
    if (type !== 'vend') {
      continue;
    }
    
    // Parse date
    const parsedDate = parseDateString(dateStr);
    const errors: string[] = [];
    
    if (!parsedDate) {
      errors.push(`Date invalide: "${dateStr}"`);
    }
    
    // Convert centimes to euros
    const insertedEur = amountCentimes / 100;
    const priceEur = priceCentimes / 100;
    const changeEur = changeCentimes / 100;
    
    // Validate price
    if (priceEur <= 0) {
      errors.push(`Prix invalide: ${priceCentimes}`);
    }
    
    // Determine the final amount (price is the transaction amount)
    const finalAmount = priceEur;
    
    // Normalize payment mode
    const normalizedPaymentMode = normalizePaymentMode(paymentMode);
    
    // Extract time from date if available
    const time = parsedDate ? extractTimeFromDate(parsedDate) : undefined;
    
    const isValid = parsedDate !== null && priceEur > 0;
    
    result.push({
      date: parsedDate || undefined,
      time,
      amount: finalAmount > 0 ? finalAmount : undefined,
      machine: name || undefined,
      paymentMode: normalizedPaymentMode,
      isValid,
      errors,
      rawData: values,
      // Extended fields
      insertedEur: normalizedPaymentMode === 'ESP' && insertedEur > 0 ? insertedEur : undefined,
      priceEur: priceEur > 0 ? priceEur : undefined,
      changeEur: normalizedPaymentMode === 'ESP' && changeEur > 0 ? changeEur : undefined,
      machineName: name || undefined,
      source: 'events_csv',
    });
  }
  
  return result;
}

/**
 * Parse a CSV line respecting quotes
 */
function parseLine(line: string, separator: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === separator && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Parse date string (ISO format: 2024-01-15T10:30:00 or similar)
 */
function parseDateString(dateStr: string): Date | null {
  if (!dateStr || !dateStr.trim()) return null;
  
  const trimmed = dateStr.trim();
  
  // Try ISO format
  const isoDate = new Date(trimmed);
  if (!isNaN(isoDate.getTime())) {
    return isoDate;
  }
  
  // Try other common formats
  // French format: DD/MM/YYYY HH:MM:SS
  const frenchMatch = trimmed.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})\s*(\d{1,2})?:?(\d{2})?:?(\d{2})?$/);
  if (frenchMatch) {
    const [, day, month, year, hour = '0', min = '0', sec = '0'] = frenchMatch;
    const date = new Date(
      parseInt(year, 10),
      parseInt(month, 10) - 1,
      parseInt(day, 10),
      parseInt(hour, 10),
      parseInt(min, 10),
      parseInt(sec, 10)
    );
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  
  return null;
}

/**
 * Extract time string (HH:MM) from Date
 */
function extractTimeFromDate(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Normalize payment mode to standard format
 */
function normalizePaymentMode(mode: string): string {
  const normalized = mode.toLowerCase().trim();
  
  if (normalized === 'cb' || normalized === 'carte' || normalized === 'card') {
    return 'CB';
  }
  if (normalized === 'esp' || normalized === 'espece' || normalized === 'espèce' || normalized === 'cash') {
    return 'ESP';
  }
  
  return mode.toUpperCase();
}

/**
 * Calculate import summary from Events parsed rows
 */
export function calculateEventsSummary(parsedRows: EventsParsedRow[]): ImportSummary {
  const validRows = parsedRows.filter(r => r.isValid);
  const dates = validRows.map(r => r.date).filter((d): d is Date => d !== undefined);
  const amounts = validRows.map(r => r.amount).filter((a): a is number => a !== undefined);
  
  // Calculate daily breakdown
  const dailyMap = new Map<string, { amount: number; count: number }>();
  validRows.forEach(row => {
    if (row.date && row.amount) {
      const dateKey = row.date.toISOString().split('T')[0];
      const existing = dailyMap.get(dateKey) || { amount: 0, count: 0 };
      dailyMap.set(dateKey, {
        amount: existing.amount + row.amount,
        count: existing.count + 1,
      });
    }
  });
  
  const dailyBreakdown = Array.from(dailyMap.entries())
    .map(([date, data]) => ({
      date,
      amount: Math.round(data.amount * 100) / 100,
      count: data.count,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
  
  return {
    totalRows: parsedRows.length,
    validRows: validRows.length,
    invalidRows: parsedRows.length - validRows.length,
    minDate: dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : null,
    maxDate: dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : null,
    totalAmount: amounts.reduce((sum, a) => sum + a, 0),
    dailyBreakdown,
  };
}
