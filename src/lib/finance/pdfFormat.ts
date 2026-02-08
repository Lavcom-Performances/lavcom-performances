/**
 * PDF Formatting Helpers
 * Bank-grade number, currency, and percentage formatting for financial PDFs
 * 
 * Key rules:
 * - Never insert slashes as separators
 * - Normalize -0 to 0
 * - Use French locale with proper thousand separators (narrow no-break space)
 * - Return "—" for null/undefined values
 */

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
function normalizeNumber(value: number, precision = 2): number {
  // Round to precision to avoid floating point issues
  const rounded = Math.round(value * Math.pow(10, precision)) / Math.pow(10, precision);
  // Normalize -0 to 0
  if (Math.abs(rounded) < Math.pow(10, -precision)) return 0;
  return rounded;
}

/**
 * Remove any slash artifacts from formatted strings (defensive cleanup)
 * Targets patterns like "140 /302 €" or "140/ 302 €"
 */
function cleanSlashArtifacts(text: string): string {
  // Replace various slash patterns with narrow no-break space
  return text
    .replace(/\s*\/\s*/g, '\u202F') // Replace slash surrounded by spaces with NNBSP
    .replace(/\u00A0\/\u00A0/g, '\u202F') // Replace NBSP/NBSP patterns
    .replace(/\s\/\s/g, '\u202F'); // Standard space slash space
}

/**
 * Format a number as EUR currency (whole euros, no decimals)
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
  
  const formatted = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(normalized);
  
  return cleanSlashArtifacts(formatted);
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

/**
 * Format a percentage from a ratio
 * @param num - Numerator
 * @param denom - Denominator
 * @returns Formatted percentage or "—" if denominator is 0/null
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
  
  const formatted = new Intl.NumberFormat('fr-FR', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(ratio);
  
  return cleanSlashArtifacts(formatted);
}

/**
 * Format a percentage from a decimal value (0.25 = 25%)
 * @param value - Decimal value (0-1)
 * @returns Formatted percentage or "—" if null
 */
export function formatPctValue(value: number | null | undefined): string {
  const safe = safeNumber(value);
  if (safe === null) return '—';
  
  const normalized = normalizeNumber(safe, 4);
  
  const formatted = new Intl.NumberFormat('fr-FR', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(normalized);
  
  return cleanSlashArtifacts(formatted);
}

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
  
  const formatted = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(normalized);
  
  return cleanSlashArtifacts(formatted);
}

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
