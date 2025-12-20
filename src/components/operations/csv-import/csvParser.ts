import { CSVColumn, ColumnMapping, ParsedRow, ImportSummary } from "./types";
import { parse, isValid } from "date-fns";

/**
 * Parse CSV text into columns with headers and sample data
 */
export function parseCSVToColumns(csvText: string): { columns: CSVColumn[]; rows: string[][] } {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) {
    return { columns: [], rows: [] };
  }

  // Detect separator (comma, semicolon, tab)
  const firstLine = lines[0];
  let separator = ",";
  if (firstLine.includes(";")) separator = ";";
  else if (firstLine.includes("\t")) separator = "\t";

  const headers = parseLine(firstLine, separator);
  const dataRows = lines.slice(1).map((line) => parseLine(line, separator));

  const columns: CSVColumn[] = headers.map((header, index) => ({
    index,
    header: header.trim(),
    samples: dataRows.slice(0, 5).map((row) => row[index] || ""),
  }));

  return { columns, rows: dataRows };
}

function parseLine(line: string, separator: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === separator && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Auto-detect column mapping based on header names and sample data
 */
export function autoDetectMapping(columns: CSVColumn[]): ColumnMapping {
  const mapping: ColumnMapping = {
    date: null,
    time: null,
    amount: null,
    machine: null,
    program: null,
    paymentMode: null,
  };

  columns.forEach((col, index) => {
    const headerLower = col.header.toLowerCase();
    const samples = col.samples.filter(s => s.trim() !== "");

    // Date detection
    if (mapping.date === null && (
      headerLower.includes("date") ||
      headerLower === "jour" ||
      samples.some(s => isDateLike(s))
    )) {
      mapping.date = index;
    }

    // Time detection
    if (mapping.time === null && (
      headerLower.includes("heure") ||
      headerLower === "time" ||
      headerLower === "horaire" ||
      samples.some(s => isTimeLike(s))
    )) {
      mapping.time = index;
    }

    // Amount detection
    if (mapping.amount === null && (
      headerLower.includes("montant") ||
      headerLower.includes("prix") ||
      headerLower.includes("amount") ||
      headerLower.includes("total") ||
      headerLower === "€" ||
      samples.some(s => isAmountLike(s))
    )) {
      mapping.amount = index;
    }

    // Machine detection
    if (mapping.machine === null && (
      headerLower.includes("machine") ||
      headerLower.includes("sélection") ||
      headerLower.includes("selection") ||
      headerLower.includes("equipement") ||
      headerLower.includes("équipement")
    )) {
      mapping.machine = index;
    }

    // Program/cycle detection
    if (mapping.program === null && (
      headerLower.includes("programme") ||
      headerLower.includes("cycle") ||
      headerLower.includes("program")
    )) {
      mapping.program = index;
    }

    // Payment mode detection
    if (mapping.paymentMode === null && (
      headerLower.includes("paiement") ||
      headerLower.includes("payment") ||
      headerLower.includes("mode") ||
      headerLower === "cb" ||
      headerLower === "esp"
    )) {
      mapping.paymentMode = index;
    }
  });

  return mapping;
}

function isDateLike(value: string): boolean {
  // French date format DD/MM/YYYY or DD-MM-YYYY
  if (/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/.test(value)) return true;
  // ISO format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return true;
  return false;
}

function isTimeLike(value: string): boolean {
  // HH:MM or HH:MM:SS
  return /^\d{1,2}:\d{2}(:\d{2})?$/.test(value);
}

function isAmountLike(value: string): boolean {
  // Numbers with comma or point as decimal separator
  const cleaned = value.replace(/[€\s]/g, "").replace(",", ".");
  return !isNaN(parseFloat(cleaned)) && parseFloat(cleaned) > 0;
}

/**
 * Parse amount string to number, handling French format (comma as decimal)
 */
export function parseAmount(value: string): number | null {
  if (!value || value.trim() === "") return null;
  const cleaned = value.replace(/[€\s]/g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Parse date string supporting French and ISO formats
 */
export function parseDate(value: string): Date | null {
  if (!value || value.trim() === "") return null;

  // Try French format DD/MM/YYYY
  let date = parse(value, "dd/MM/yyyy", new Date());
  if (isValid(date)) return date;

  // Try French format DD-MM-YYYY
  date = parse(value, "dd-MM-yyyy", new Date());
  if (isValid(date)) return date;

  // Try ISO format YYYY-MM-DD
  date = parse(value, "yyyy-MM-dd", new Date());
  if (isValid(date)) return date;

  // Try with dots DD.MM.YYYY
  date = parse(value, "dd.MM.yyyy", new Date());
  if (isValid(date)) return date;

  return null;
}

/**
 * Parse rows using the column mapping
 */
export function parseRows(rows: string[][], mapping: ColumnMapping): ParsedRow[] {
  return rows.map((row) => {
    const errors: string[] = [];
    let parsedDate: Date | undefined;
    let parsedAmount: number | undefined;

    // Parse date
    if (mapping.date !== null) {
      const dateValue = row[mapping.date];
      const date = parseDate(dateValue);
      if (date) {
        parsedDate = date;
      } else if (dateValue && dateValue.trim() !== "") {
        errors.push(`Date invalide: "${dateValue}"`);
      }
    }

    // Parse amount
    if (mapping.amount !== null) {
      const amountValue = row[mapping.amount];
      const amount = parseAmount(amountValue);
      if (amount !== null) {
        parsedAmount = amount;
      } else if (amountValue && amountValue.trim() !== "") {
        errors.push(`Montant invalide: "${amountValue}"`);
      }
    }

    const isValid = parsedDate !== undefined && parsedAmount !== undefined && parsedAmount > 0;

    return {
      date: parsedDate,
      time: mapping.time !== null ? row[mapping.time] : undefined,
      amount: parsedAmount,
      machine: mapping.machine !== null ? row[mapping.machine] : undefined,
      program: mapping.program !== null ? row[mapping.program] : undefined,
      paymentMode: mapping.paymentMode !== null ? row[mapping.paymentMode] : undefined,
      isValid,
      errors,
      rawData: row,
    };
  });
}

/**
 * Calculate import summary from parsed rows
 */
export function calculateSummary(parsedRows: ParsedRow[]): ImportSummary {
  const validRows = parsedRows.filter((r) => r.isValid);
  const dates = validRows.map((r) => r.date).filter((d): d is Date => d !== undefined);
  const amounts = validRows.map((r) => r.amount).filter((a): a is number => a !== undefined);

  return {
    totalRows: parsedRows.length,
    validRows: validRows.length,
    invalidRows: parsedRows.length - validRows.length,
    minDate: dates.length > 0 ? new Date(Math.min(...dates.map((d) => d.getTime()))) : null,
    maxDate: dates.length > 0 ? new Date(Math.max(...dates.map((d) => d.getTime()))) : null,
    totalAmount: amounts.reduce((sum, a) => sum + a, 0),
  };
}
