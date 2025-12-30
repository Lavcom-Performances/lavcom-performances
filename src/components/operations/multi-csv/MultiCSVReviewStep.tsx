/**
 * Review step showing aggregated data and line selection
 */

import { useMemo } from "react";
import { FileWithMeta } from "./types";
import { MultiCsvParsedRow, calculateMultiCsvSummary, MultiCsvFile } from "@/lib/csv/multiCsvTypes";
import { MultiCsvSummaryCard } from "./MultiCsvSummaryCard";
import { MultiCsvLinesPreview } from "./MultiCsvLinesPreview";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface MultiCSVReviewStepProps {
  files: FileWithMeta[];
  allRows: MultiCsvParsedRow[];
  onRowSelectionChange: (rowIndex: number, selected: boolean) => void;
  onSelectAllByStatus: (status: "importable" | "to_review", selected: boolean) => void;
}

export function MultiCSVReviewStep({
  files,
  allRows,
  onRowSelectionChange,
  onSelectAllByStatus,
}: MultiCSVReviewStepProps) {
  // Create a simplified version for summary calculation
  const multiCsvFiles: MultiCsvFile[] = useMemo(() => {
    return files.map(f => ({
      id: f.id,
      file: f.file,
      status: f.status as MultiCsvFile['status'],
      site_id: f.siteId,
      site_name: f.siteName,
      parsed_rows: f.multiCsvRows || [],
      total_rows: f.multiCsvRows?.length || 0,
      importable_count: f.multiCsvRows?.filter(r => r.status === 'importable').length || 0,
      to_review_count: f.multiCsvRows?.filter(r => r.status === 'to_review').length || 0,
      invalid_count: f.multiCsvRows?.filter(r => r.status === 'invalid').length || 0,
      error: f.error,
      duplicate_warning: f.duplicateWarning,
    }));
  }, [files]);

  const summary = useMemo(() => calculateMultiCsvSummary(multiCsvFiles, allRows), [multiCsvFiles, allRows]);

  const selectedCount = allRows.filter(r => r.selected).length;
  const readyToImport = selectedCount > 0;

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <MultiCsvSummaryCard files={multiCsvFiles} rows={allRows} />

      {/* Status overview */}
      <div className="flex items-center justify-between flex-wrap gap-2 p-3 rounded-lg bg-muted/50">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">
            <span className="font-medium text-foreground">{selectedCount}</span> ligne{selectedCount > 1 ? "s" : ""} sélectionnée{selectedCount > 1 ? "s" : ""} pour import
          </span>
        </div>
        {readyToImport ? (
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4" />
            Prêt pour l'import
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
            <AlertCircle className="h-4 w-4" />
            Sélectionnez des lignes à importer
          </div>
        )}
      </div>

      {/* Lines Preview with tabs */}
      <MultiCsvLinesPreview
        rows={allRows}
        onRowSelectionChange={onRowSelectionChange}
        onSelectAllByStatus={onSelectAllByStatus}
      />
    </div>
  );
}
