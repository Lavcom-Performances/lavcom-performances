/**
 * Parse amount strings to cents (integer)
 * Handles various formats: euros, centimes, with/without currency symbols
 */

/**
 * Parse an amount string and return value in cents
 * @param value - Raw amount string (may include €, comma/point decimals)
 * @returns Amount in cents (integer) or null if parsing fails
 */
export function parseAmountToCents(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  
  // If already a number
  if (typeof value === 'number') {
    if (isNaN(value)) return null;
    // Determine if it's cents or euros based on magnitude
    return normalizeToZents(value);
  }
  
  // Clean the string
  let cleaned = String(value).trim();
  
  // Remove currency symbols and spaces
  cleaned = cleaned.replace(/[€$£\s]/g, '');
  
  // Handle empty string
  if (!cleaned || cleaned === '-') return null;
  
  // Detect decimal separator
  // French format: 1 234,56 or 1234,56
  // English format: 1,234.56 or 1234.56
  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');
  
  let numericValue: number;
  
  if (hasComma && hasDot) {
    // Both separators - determine which is decimal
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    
    if (lastComma > lastDot) {
      // French format: 1.234,56
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // English format: 1,234.56
      cleaned = cleaned.replace(/,/g, '');
    }
    numericValue = parseFloat(cleaned);
  } else if (hasComma) {
    // Check if comma is thousands separator (1,234) or decimal (1,23)
    const parts = cleaned.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      // Decimal separator
      cleaned = cleaned.replace(',', '.');
    } else {
      // Thousands separator
      cleaned = cleaned.replace(/,/g, '');
    }
    numericValue = parseFloat(cleaned);
  } else if (hasDot) {
    // Check if dot is thousands separator or decimal
    const parts = cleaned.split('.');
    if (parts.length === 2 && parts[1].length <= 2) {
      // Decimal separator
      numericValue = parseFloat(cleaned);
    } else if (parts.length > 2) {
      // Multiple dots = thousands separators
      cleaned = cleaned.replace(/\./g, '');
      numericValue = parseFloat(cleaned);
    } else {
      numericValue = parseFloat(cleaned);
    }
  } else {
    numericValue = parseFloat(cleaned);
  }
  
  if (isNaN(numericValue)) return null;
  
  return normalizeToZents(numericValue);
}

/**
 * Normalize a numeric value to cents
 * Uses heuristics to determine if value is already in cents or in euros
 */
function normalizeToZents(value: number): number {
  // If value > 1000 and is an integer, assume it's already in cents
  // (e.g., 450 cents = 4.50€, 1250 cents = 12.50€)
  if (value > 1000 && Number.isInteger(value)) {
    return Math.round(value);
  }
  
  // If value has decimals or is <= 1000, assume it's in euros
  // Convert to cents
  return Math.round(value * 100);
}

/**
 * Convert cents to euros
 */
export function centsToEuros(cents: number | null | undefined): number | null {
  if (cents === null || cents === undefined) return null;
  return Math.round(cents) / 100;
}

/**
 * Format cents as euro string
 */
export function formatCentsAsEuros(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return '—';
  const euros = cents / 100;
  return `${euros.toFixed(2)} €`;
}

/**
 * Get amount from multiple possible columns in priority order
 * @param row - Object with possible amount columns
 * @param priorityColumns - Column names in priority order
 * @returns Amount in cents or null
 */
export function getAmountFromColumns(
  row: Record<string, string | number | null | undefined>,
  priorityColumns: string[] = ['price', 'amount', 'prix', 'insere', 'inserted', 'montant']
): number | null {
  for (const col of priorityColumns) {
    const value = row[col] ?? row[col.toLowerCase()] ?? row[col.toUpperCase()];
    if (value !== null && value !== undefined && value !== '') {
      const cents = parseAmountToCents(value);
      if (cents !== null && cents > 0) {
        return cents;
      }
    }
  }
  return null;
}
