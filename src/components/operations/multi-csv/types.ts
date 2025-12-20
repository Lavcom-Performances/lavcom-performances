import { ImportSummary, ParsedRow } from "../csv-import/types";

export interface FileWithMeta {
  id: string;
  file: File;
  status: "pending" | "parsing" | "ready" | "importing" | "success" | "error";
  siteId: string | null;
  siteName?: string;
  summary: ImportSummary | null;
  parsedRows: ParsedRow[];
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
  id: "upload" | "associate" | "import";
  title: string;
  description: string;
}

export const WIZARD_STEPS: WizardStep[] = [
  {
    id: "upload",
    title: "Upload",
    description: "Sélectionnez vos fichiers CSV",
  },
  {
    id: "associate",
    title: "Association",
    description: "Associez chaque fichier à une laverie",
  },
  {
    id: "import",
    title: "Import",
    description: "Importez et vérifiez les résultats",
  },
];
