/**
 * PDF Formatting Helpers
 * Bank-grade number, currency, and percentage formatting for financial PDFs
 * 
 * CRITICAL RULES:
 * - Never insert slashes as separators (jsPDF cannot render Unicode NNBSP)
 * - Use REGULAR SPACE for thousands separator (not narrow no-break space)
 * - Use COMMA for decimals (French style)
 * - Normalize -0 to 0
 * - Return "—" for null/undefined values
 * - Right-align numeric columns in tables
 * - Use "ans" for years, "%" for rates, "€" for currency (NEVER mix units)
 */

// =====================================================
// CORE PARSING & NORMALIZATION
// =====================================================

/**
 * Parse any value to a number, return null if invalid
 */
export function safeNumber(n: unknown): number | null {
  if (n === null || n === undefined) return null;
  const parsed = typeof n === 'number' ? n : Number(n);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Normalize a number: remove -0, round to avoid floating point issues
 * @param value - The number to normalize
 * @param precision - Decimal precision (default 2)
 */
export function normalizeNumber(value: number, precision = 2): number {
  // Round to precision to avoid floating point issues
  const rounded = Math.round(value * Math.pow(10, precision)) / Math.pow(10, precision);
  // Normalize -0 to 0
  if (Math.abs(rounded) < Math.pow(10, -precision)) return 0;
  return rounded;
}

// =====================================================
// CORE FRENCH NUMBER FORMATTING (jsPDF-safe)
// =====================================================

/**
 * Format a number with French-style separators
 * CRITICAL: Uses REGULAR SPACE for thousands (not Unicode NNBSP which shows as "/" in jsPDF)
 * 
 * @param value - The number to format
 * @param decimals - Number of decimal places (default 0)
 * @returns Formatted string like "59 000" or "1 234,56"
 */
export function formatNumberFr(value: number, decimals = 0): string {
  const isNegative = value < 0;
  const absValue = Math.abs(value);
  
  // Split into integer and decimal parts
  const fixed = absValue.toFixed(decimals);
  const [intPart, decPart] = fixed.split(".");
  
  // Add thousand separators with REGULAR SPACE (ASCII 32)
  const withSeparators = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  
  // Reassemble with comma for decimals (French style)
  let result = withSeparators;
  if (decimals > 0 && decPart) {
    result += "," + decPart;
  }
  
  return isNegative ? "-" + result : result;
}

// =====================================================
// CURRENCY FORMATTING
// =====================================================

/**
 * Format a number as EUR currency (default: whole euros, no decimals)
 * @param amountCents - Amount in cents (or euros if fromCents=false)
 * @param options - Formatting options
 * @returns Formatted string like "140 302 €" or "—" if null
 */
export function formatEUR(
  amountCents: number | null | undefined,
  options: { fromCents?: boolean; decimals?: number } = {}
): string {
  const { fromCents = true, decimals = 0 } = options;
  
  const safe = safeNumber(amountCents);
  if (safe === null) return '—';
  
  const euros = fromCents ? safe / 100 : safe;
  const normalized = normalizeNumber(euros, decimals);
  
  return formatNumberFr(normalized, decimals) + " €";
}

/**
 * Format a number as EUR currency with 2 decimal places
 * Use for prices, unit costs, detailed line items
 */
export function formatEUR2(
  amountCents: number | null | undefined,
  options: { fromCents?: boolean } = {}
): string {
  return formatEUR(amountCents, { ...options, decimals: 2 });
}

/**
 * Format a number as EUR currency (euros, not cents)
 * Convenience wrapper for when values are already in euros
 */
export function formatEURFromEuros(
  amount: number | null | undefined,
  decimals = 0
): string {
  return formatEUR(amount, { fromCents: false, decimals });
}

// =====================================================
// PERCENTAGE FORMATTING
// =====================================================

/**
 * Format a percentage from a ratio (num/denom)
 * @param num - Numerator
 * @param denom - Denominator
 * @returns Formatted percentage like "25,0 %" or "—" if denominator is 0/null
 */
export function formatPct(
  num: number | null | undefined,
  denom: number | null | undefined
): string {
  const safeNum = safeNumber(num);
  const safeDenom = safeNumber(denom);
  
  if (safeNum === null || safeDenom === null || safeDenom === 0) {
    return '—';
  }
  
  const ratio = normalizeNumber(safeNum / safeDenom, 4);
  const percent = ratio * 100;
  
  // Format with French comma for decimals
  return percent.toFixed(1).replace(".", ",") + " %";
}

/**
 * Format a percentage from a decimal value (0.25 = 25%)
 * @param value - Decimal value (0-1)
 * @returns Formatted percentage like "25,0 %" or "—" if null
 */
export function formatPctValue(value: number | null | undefined): string {
  const safe = safeNumber(value);
  if (safe === null) return '—';
  
  const normalized = normalizeNumber(safe, 4);
  const percent = normalized * 100;
  
  // Format with French comma for decimals
  return percent.toFixed(1).replace(".", ",") + " %";
}

// =====================================================
// PLAIN NUMBER FORMATTING
// =====================================================

/**
 * Format a plain number with French locale (thousand separators)
 */
export function formatNumber(
  value: number | null | undefined,
  decimals = 0
): string {
  const safe = safeNumber(value);
  if (safe === null) return '—';
  
  const normalized = normalizeNumber(safe, decimals);
  return formatNumberFr(normalized, decimals);
}

// =====================================================
// DURATION FORMATTING
// =====================================================

/**
 * Format a duration in years (e.g., "7 ans")
 * IMPORTANT: Never return "€" for duration values
 */
export function formatYears(value: number | null | undefined): string {
  const safe = safeNumber(value);
  if (safe === null) return '—';
  
  const normalized = Math.round(safe);
  if (normalized === 0) return '—';
  
  return normalized === 1 ? '1 an' : `${normalized} ans`;
}

/**
 * Format a duration in months (e.g., "12 mois")
 */
export function formatMonths(value: number | null | undefined): string {
  const safe = safeNumber(value);
  if (safe === null) return '—';
  
  const normalized = Math.round(safe);
  if (normalized === 0) return '—';
  
  return `${normalized} mois`;
}

// =====================================================
// VALIDATION HELPERS
// =====================================================

/**
 * Validate balance sheet consistency
 * Returns true if assets and liabilities are balanced (within 1€ tolerance)
 */
export function validateBalanceSheet(
  totalAssets: number | null | undefined,
  totalLiabilities: number | null | undefined
): { isValid: boolean; difference: number } {
  const safeAssets = safeNumber(totalAssets) || 0;
  const safeLiabilities = safeNumber(totalLiabilities) || 0;
  
  const difference = Math.abs(safeAssets - safeLiabilities);
  
  return {
    isValid: difference <= 1,
    difference,
  };
}

// =====================================================
// PDF TABLE STYLING PRESETS
// =====================================================

/**
 * Standard column styles for financial PDF tables
 * - Numeric columns right-aligned
 * - Fixed widths for consistency
 */
export const PDF_COLUMN_STYLES = {
  label: { halign: 'left' as const, cellWidth: 60 },
  currency: { halign: 'right' as const, cellWidth: 30 },
  currencyWide: { halign: 'right' as const, cellWidth: 40 },
  percent: { halign: 'right' as const, cellWidth: 25 },
  number: { halign: 'right' as const, cellWidth: 25 },
  year: { halign: 'center' as const, cellWidth: 25 },
};

/**
 * Standard header styling for financial PDF tables
 */
export const PDF_HEADER_STYLE = {
  fillColor: [47, 117, 181] as [number, number, number], // Brand blue
  textColor: [255, 255, 255] as [number, number, number],
  fontStyle: 'bold' as const,
  fontSize: 9,
};

/**
 * Standard body styling for financial PDF tables
 */
export const PDF_BODY_STYLE = {
  fontSize: 9,
  textColor: [0, 0, 0] as [number, number, number],
};

/**
 * Alternate row styling for financial PDF tables
 */
export const PDF_ALTERNATE_ROW_STYLE = {
  fillColor: [242, 242, 242] as [number, number, number],
};
