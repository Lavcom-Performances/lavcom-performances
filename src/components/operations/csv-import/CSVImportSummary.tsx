import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ImportSummary } from "./types";
import { Calendar, FileText, AlertTriangle, Euro } from "lucide-react";

interface CSVImportSummaryProps {
  summary: ImportSummary;
}

export function CSVImportSummary({ summary }: CSVImportSummaryProps) {
  const formatDate = (date: Date | null) => {
    if (!date) return "-";
    return format(date, "dd/MM/yyyy", { locale: fr });
  };

  return (
    <div className="bg-muted/50 rounded-lg p-4 space-y-3">
      <h4 className="font-medium text-sm text-foreground">Récapitulatif avant import</h4>
      
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-lavcom-green" />
          <div>
            <p className="text-muted-foreground text-xs">Période</p>
            <p className="font-medium">
              {formatDate(summary.minDate)} → {formatDate(summary.maxDate)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Euro className="h-4 w-4 text-lavcom-green" />
          <div>
            <p className="text-muted-foreground text-xs">Total estimé</p>
            <p className="font-medium">{summary.totalAmount.toFixed(2)} €</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-lavcom-green" />
          <div>
            <p className="text-muted-foreground text-xs">Lignes valides</p>
            <p className="font-medium text-lavcom-green">{summary.validRows}</p>
          </div>
        </div>

        {summary.invalidRows > 0 && (
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <div>
              <p className="text-muted-foreground text-xs">Lignes ignorées</p>
              <p className="font-medium text-amber-600">{summary.invalidRows}</p>
            </div>
          </div>
        )}
      </div>

      {summary.invalidRows > 0 && (
        <p className="text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 p-2 rounded">
          Certaines lignes semblent incomplètes : elles seront ignorées. Vous aurez un récapitulatif à la fin.
        </p>
      )}
    </div>
  );
}
