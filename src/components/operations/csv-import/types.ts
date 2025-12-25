export interface CSVColumn {
  index: number;
  header: string;
  samples: string[];
}

export interface ColumnMapping {
  date: number | null;
  time: number | null;
  amount: number | null;
  machine: number | null;
  program: number | null;
  paymentMode: number | null;
}

export interface ParsedRow {
  date?: Date;
  time?: string;
  amount?: number;
  machine?: string;
  program?: string;
  paymentMode?: string;
  isValid: boolean;
  errors: string[];
  rawData: string[];
}

export interface DailyAmount {
  date: string;
  amount: number;
  count: number;
}

export interface ImportSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  minDate: Date | null;
  maxDate: Date | null;
  totalAmount: number;
  dailyBreakdown: DailyAmount[];
}

export interface ImportResult {
  success: boolean;
  imported: number;
  ignored: number;
  errors: string[];
}

export const COLUMN_OPTIONS = [
  { value: "date", label: "Date", required: true },
  { value: "time", label: "Heure", required: false },
  { value: "amount", label: "Montant", required: true },
  { value: "machine", label: "Machine", required: false },
  { value: "program", label: "Programme/Cycle", required: false },
  { value: "paymentMode", label: "Mode de paiement", required: false },
  { value: "ignore", label: "Ignorer", required: false },
] as const;

export type ColumnType = typeof COLUMN_OPTIONS[number]["value"];
