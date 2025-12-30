import { ImportSummary, ParsedRow } from "../csv-import/types";
import { MultiCsvParsedRow } from "@/lib/csv/multiCsvTypes";

export interface FileWithMeta {
  id: string;
  file: File;
  status: "pending" | "parsing" | "ready" | "importing" | "success" | "error";
  siteId: string | null;
  siteName?: string;
  summary: ImportSummary | null;
  parsedRows: ParsedRow[];
  // New multi-csv parsed rows with enhanced parsing
  multiCsvRows?: MultiCsvParsedRow[];
  error: string | null;
  duplicateWarning: string | null;
  importResult?: {
    imported: number;
    ignored: number;
    errors: string[];
  };
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  message: string | null;
}

export interface WizardStep {
  id: "upload" | "associate" | "review" | "import";
  title: string;
  description: string;
}

export const WIZARD_STEPS: WizardStep[] = [
  {
    id: "upload",
    title: "Upload",
    description: "Sélectionnez vos fichiers CSV (max 10)",
  },
  {
    id: "associate",
    title: "Association",
    description: "Associez chaque fichier à une laverie",
  },
  {
    id: "review",
    title: "Vérification",
    description: "Vérifiez les lignes et totaux avant import",
  },
  {
    id: "import",
    title: "Import",
    description: "Importez et vérifiez les résultats",
  },
];
