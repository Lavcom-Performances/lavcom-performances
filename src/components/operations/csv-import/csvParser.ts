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
 * Score a column for being a date column (0-100)
 */
function scoreDateColumn(col: CSVColumn): number {
  let score = 0;
  const headerLower = col.header.toLowerCase();
  const samples = col.samples.filter(s => s.trim() !== "");

  // Header-based scoring
  if (headerLower === "date") score += 50;
  else if (headerLower.includes("date")) score += 40;
  else if (headerLower === "jour" || headerLower === "day") score += 35;

  // Data pattern scoring - check all samples
  if (samples.length > 0) {
    const dateMatches = samples.filter(s => isDateLike(s)).length;
    const matchRatio = dateMatches / samples.length;
    score += Math.round(matchRatio * 50);
  }

  return Math.min(score, 100);
}

/**
 * Score a column for being a time column (0-100)
 */
function scoreTimeColumn(col: CSVColumn): number {
  let score = 0;
  const headerLower = col.header.toLowerCase();
  const samples = col.samples.filter(s => s.trim() !== "");

  // Header-based scoring
  if (headerLower === "heure" || headerLower === "time") score += 50;
  else if (headerLower.includes("heure") || headerLower.includes("time")) score += 40;
  else if (headerLower === "horaire" || headerLower === "hour") score += 35;

  // Data pattern scoring
  if (samples.length > 0) {
    const timeMatches = samples.filter(s => isTimeLike(s)).length;
    const matchRatio = timeMatches / samples.length;
    score += Math.round(matchRatio * 50);
  }

  return Math.min(score, 100);
}

/**
 * Score a column for being an amount column (0-100)
 */
function scoreAmountColumn(col: CSVColumn): number {
  let score = 0;
  const headerLower = col.header.toLowerCase();
  const samples = col.samples.filter(s => s.trim() !== "");

  // Header-based scoring
  if (headerLower.includes("montant") || headerLower.includes("amount")) score += 50;
  else if (headerLower.includes("prix") || headerLower.includes("price")) score += 45;
  else if (headerLower.includes("total") || headerLower === "€" || headerLower === "eur") score += 40;
  else if (headerLower.includes("somme") || headerLower.includes("sum")) score += 35;

  // Data pattern scoring
  if (samples.length > 0) {
    const amountMatches = samples.filter(s => isAmountLike(s)).length;
    const matchRatio = amountMatches / samples.length;
    score += Math.round(matchRatio * 50);
  }

  return Math.min(score, 100);
}

/**
 * Score a column for being a machine column (0-100)
 */
function scoreMachineColumn(col: CSVColumn): number {
  let score = 0;
  const headerLower = col.header.toLowerCase();
  const samples = col.samples.filter(s => s.trim() !== "");

  // Header-based scoring
  if (headerLower.includes("machine")) score += 50;
  else if (headerLower.includes("équipement") || headerLower.includes("equipement")) score += 45;
  else if (headerLower.includes("sélection") || headerLower.includes("selection")) score += 40;
  else if (headerLower.includes("appareil") || headerLower.includes("device")) score += 35;
  else if (headerLower.includes("lave") || headerLower.includes("sèche") || headerLower.includes("seche")) score += 30;

  // Data pattern scoring - look for machine-like values
  if (samples.length > 0) {
    const machinePatterns = [
      /^(lave|sèche|seche|machine|m|l|s|lv|sl)/i,
      /\d+\s*(kg|KG)/,
      /(lavante|séchante|sechante)/i,
      /^[A-Z]?\d{1,3}$/,
    ];
    const machineMatches = samples.filter(s => 
      machinePatterns.some(p => p.test(s.trim()))
    ).length;
    score += Math.round((machineMatches / samples.length) * 30);
  }

  return Math.min(score, 100);
}

/**
 * Score a column for being a program column (0-100)
 */
function scoreProgramColumn(col: CSVColumn): number {
  let score = 0;
  const headerLower = col.header.toLowerCase();

  if (headerLower.includes("programme") || headerLower.includes("program")) score += 50;
  else if (headerLower.includes("cycle")) score += 45;
  else if (headerLower.includes("type") || headerLower.includes("mode")) score += 25;

  return Math.min(score, 100);
}

/**
 * Score a column for being a payment mode column (0-100)
 */
function scorePaymentModeColumn(col: CSVColumn): number {
  let score = 0;
  const headerLower = col.header.toLowerCase();
  const samples = col.samples.filter(s => s.trim() !== "");

  // Header-based scoring
  if (headerLower.includes("paiement") || headerLower.includes("payment")) score += 50;
  else if (headerLower === "mode" && !headerLower.includes("programme")) score += 30;
  else if (headerLower === "cb" || headerLower === "esp" || headerLower === "carte") score += 45;

  // Data pattern scoring - look for payment-like values
  if (samples.length > 0) {
    const paymentPatterns = [
      /^(cb|carte|card|esp|espèce|espece|cash|liquide|jetons?|token)/i,
      /^(visa|mastercard|mc|amex)/i,
      /^(sans.?contact|contactless|nfc)/i,
    ];
    const paymentMatches = samples.filter(s => 
      paymentPatterns.some(p => p.test(s.trim()))
    ).length;
    score += Math.round((paymentMatches / samples.length) * 40);
  }

  return Math.min(score, 100);
}

/**
 * Auto-detect column mapping based on header names and sample data with scoring
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

  // Score all columns for each type
  const scores = columns.map((col, index) => ({
    index,
    date: scoreDateColumn(col),
    time: scoreTimeColumn(col),
    amount: scoreAmountColumn(col),
    machine: scoreMachineColumn(col),
    program: scoreProgramColumn(col),
    paymentMode: scorePaymentModeColumn(col),
  }));

  // Minimum threshold for detection
  const MIN_SCORE = 25;

  // Find best match for each type (prioritize: date, amount, time, then others)
  const usedIndices = new Set<number>();

  // Date (required)
  const bestDate = scores
    .filter(s => !usedIndices.has(s.index) && s.date >= MIN_SCORE)
    .sort((a, b) => b.date - a.date)[0];
  if (bestDate) {
    mapping.date = bestDate.index;
    usedIndices.add(bestDate.index);
  }

  // Amount (required)
  const bestAmount = scores
    .filter(s => !usedIndices.has(s.index) && s.amount >= MIN_SCORE)
    .sort((a, b) => b.amount - a.amount)[0];
  if (bestAmount) {
    mapping.amount = bestAmount.index;
    usedIndices.add(bestAmount.index);
  }

  // Time (optional)
  const bestTime = scores
    .filter(s => !usedIndices.has(s.index) && s.time >= MIN_SCORE)
    .sort((a, b) => b.time - a.time)[0];
  if (bestTime) {
    mapping.time = bestTime.index;
    usedIndices.add(bestTime.index);
  }

  // Machine (optional)
  const bestMachine = scores
    .filter(s => !usedIndices.has(s.index) && s.machine >= MIN_SCORE)
    .sort((a, b) => b.machine - a.machine)[0];
  if (bestMachine) {
    mapping.machine = bestMachine.index;
    usedIndices.add(bestMachine.index);
  }

  // Program (optional)
  const bestProgram = scores
    .filter(s => !usedIndices.has(s.index) && s.program >= MIN_SCORE)
    .sort((a, b) => b.program - a.program)[0];
  if (bestProgram) {
    mapping.program = bestProgram.index;
    usedIndices.add(bestProgram.index);
  }

  // Payment mode (optional)
  const bestPayment = scores
    .filter(s => !usedIndices.has(s.index) && s.paymentMode >= MIN_SCORE)
    .sort((a, b) => b.paymentMode - a.paymentMode)[0];
  if (bestPayment) {
    mapping.paymentMode = bestPayment.index;
  }

  return mapping;
}

function isDateLike(value: string): boolean {
  const v = value.trim();
  // French date format DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  if (/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/.test(v)) return true;
  // ISO format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return true;
  // European format with time: DD/MM/YYYY HH:MM
  if (/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\s+\d{1,2}:\d{2}/.test(v)) return true;
  // ISO with time: YYYY-MM-DDTHH:MM
  if (/^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}/.test(v)) return true;
  return false;
}

function isTimeLike(value: string): boolean {
  const v = value.trim();
  // HH:MM or HH:MM:SS
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(v)) return true;
  // HHhMM format (French)
  if (/^\d{1,2}h\d{2}$/i.test(v)) return true;
  return false;
}

function isAmountLike(value: string): boolean {
  const v = value.trim();
  // Skip if looks like a date or time
  if (isDateLike(v) || isTimeLike(v)) return false;
  // Remove currency symbols and spaces
  const cleaned = v.replace(/[€$£\s]/g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  // Valid amount: positive number, typically between 0.01 and 10000
  return !isNaN(num) && num > 0 && num < 10000;
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
