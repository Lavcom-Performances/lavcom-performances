/**
 * Sanitization utilities for CSV/Excel exports to prevent formula injection attacks.
 * 
 * When a cell starts with certain characters (= + - @), Excel/Google Sheets
 * can interpret it as a formula, leading to potential security issues.
 * 
 * Reference: https://owasp.org/www-community/attacks/CSV_Injection
 */

/** Characters that can trigger formula execution in spreadsheet applications */
const FORMULA_TRIGGER_CHARS = ['=', '+', '-', '@'];

/**
 * Sanitizes a single string value for safe use in CSV/Excel exports.
 * If the value starts with a formula trigger character, it prefixes with a single quote.
 * 
 * @param value - The string value to sanitize
 * @returns The sanitized string value
 * 
 * @example
 * sanitizeCell("=cmd|...")  // Returns "'=cmd|..."
 * sanitizeCell("+SUM(A1)")  // Returns "'+SUM(A1)"
 * sanitizeCell("-ALERT")    // Returns "'-ALERT"
 * sanitizeCell("@import")   // Returns "'@import"
 * sanitizeCell("Normal text") // Returns "Normal text"
 */
export function sanitizeCell(value: string): string {
  if (!value || typeof value !== 'string') {
    return value;
  }
  
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return value;
  }
  
  const firstChar = trimmed.charAt(0);
  if (FORMULA_TRIGGER_CHARS.includes(firstChar)) {
    // Prefix with single quote to prevent formula execution
    return `'${value}`;
  }
  
  return value;
}

/**
 * Sanitizes a value for CSV export. Handles different types appropriately:
 * - Strings: Sanitized for formula injection
 * - Numbers: Kept as-is (numeric, no sanitization needed)
 * - null/undefined: Converted to empty string
 * - Other types: Converted to string and sanitized
 * 
 * @param value - Any value to prepare for CSV export
 * @returns The sanitized value as a string
 */
export function sanitizeForCsv(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  // Keep numbers as-is - they're safe
  if (typeof value === 'number') {
    return isNaN(value) ? '' : String(value);
  }
  
  // Booleans are safe
  if (typeof value === 'boolean') {
    return String(value);
  }
  
  // Sanitize strings
  if (typeof value === 'string') {
    return sanitizeCell(value);
  }
  
  // Convert other types to string and sanitize
  return sanitizeCell(String(value));
}

/**
 * Sanitizes an entire row of data for CSV export.
 * 
 * @param row - Array of values to sanitize
 * @returns Array of sanitized string values
 */
export function sanitizeRow(row: unknown[]): string[] {
  return row.map(sanitizeForCsv);
}

/**
 * Escapes a value for CSV format (handles quotes and special characters)
 * and sanitizes against formula injection.
 * 
 * @param value - The value to escape and sanitize
 * @param separator - The field separator (default: ";")
 * @returns The escaped and sanitized value ready for CSV
 */
export function escapeCsvValue(value: unknown, separator: string = ';'): string {
  const sanitized = sanitizeForCsv(value);
  
  // If the value contains the separator, quotes, or newlines, wrap in quotes
  if (
    sanitized.includes(separator) ||
    sanitized.includes('"') ||
    sanitized.includes('\n') ||
    sanitized.includes('\r')
  ) {
    // Escape existing quotes by doubling them
    return `"${sanitized.replace(/"/g, '""')}"`;
  }
  
  return sanitized;
}

/**
 * Builds a CSV line from an array of values, properly escaped and sanitized.
 * 
 * @param values - Array of values for the CSV row
 * @param separator - The field separator (default: ";")
 * @returns A properly formatted CSV line
 */
export function buildCsvLine(values: unknown[], separator: string = ';'): string {
  return values.map(v => escapeCsvValue(v, separator)).join(separator);
}

/**
 * Builds a complete CSV content string from headers and rows.
 * Includes BOM for Excel UTF-8 compatibility.
 * 
 * @param headers - Array of header strings
 * @param rows - Array of row arrays
 * @param options - Optional configuration
 * @returns Complete CSV content with BOM
 */
export function buildCsvContent(
  headers: string[],
  rows: unknown[][],
  options: {
    separator?: string;
    includeBom?: boolean;
  } = {}
): string {
  const { separator = ';', includeBom = true } = options;
  
  const BOM = includeBom ? '\uFEFF' : '';
  const headerLine = buildCsvLine(headers, separator);
  const dataLines = rows.map(row => buildCsvLine(row, separator));
  
  return BOM + [headerLine, ...dataLines].join('\n');
}

/**
 * Large export threshold - if exceeded, show a warning to user
 */
export const LARGE_EXPORT_THRESHOLD = 10000;

/**
 * Checks if an export is considered large and should show a warning
 * 
 * @param recordCount - Number of records being exported
 * @returns Whether the export is large
 */
export function isLargeExport(recordCount: number): boolean {
  return recordCount > LARGE_EXPORT_THRESHOLD;
}
