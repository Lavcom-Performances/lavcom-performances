/**
 * Normalize CSV text for consistent parsing
 * Handles BOM, line endings, and encoding issues
 */

/**
 * Normalize CSV text content
 * - Removes BOM
 * - Normalizes line endings to \n
 * - Trims whitespace
 */
export function normalizeCsvText(text: string): string {
  // Remove BOM (Byte Order Mark) if present
  let normalized = text.replace(/^\uFEFF/, '');
  
  // Normalize line endings (CRLF -> LF, CR -> LF)
  normalized = normalized.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Trim leading/trailing whitespace
  normalized = normalized.trim();
  
  return normalized;
}

/**
 * Detect CSV separator (comma, semicolon, tab)
 */
export function detectSeparator(text: string): string {
  const lines = text.split('\n').slice(0, 5);
  const firstLine = lines[0] || '';
  
  // Count potential separators in first line
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;
  
  // Return the most common separator
  if (semicolonCount > commaCount && semicolonCount > tabCount) {
    return ';';
  }
  if (tabCount > commaCount && tabCount > semicolonCount) {
    return '\t';
  }
  return ',';
}

/**
 * Parse a CSV line respecting quotes
 */
export function parseCsvLine(line: string, separator: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
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
 * Parse CSV text to rows
 */
export function parseCsvToRows(text: string): { headers: string[]; rows: string[][] } {
  const normalized = normalizeCsvText(text);
  const separator = detectSeparator(normalized);
  const lines = normalized.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }
  
  // Skip preamble lines (like "Events" header)
  let headerIndex = 0;
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const fields = parseCsvLine(lines[i], separator);
    // A header line typically has multiple fields
    if (fields.length >= 3) {
      headerIndex = i;
      break;
    }
  }
  
  const headers = parseCsvLine(lines[headerIndex], separator).map(h => h.toLowerCase().trim());
  const rows: string[][] = [];
  
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const row = parseCsvLine(lines[i], separator);
    if (row.some(cell => cell.trim())) {
      rows.push(row);
    }
  }
  
  return { headers, rows };
}
