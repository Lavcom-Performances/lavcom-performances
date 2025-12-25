import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ImportSummary } from "./types";
import { Calendar, FileText, AlertTriangle, Euro, Hash, CheckCircle } from "lucide-react";

interface CSVImportSummaryProps {
  summary: ImportSummary;
}

export function CSVImportSummary({ summary }: CSVImportSummaryProps) {
  const formatDate = (date: Date | null) => {
    if (!date) return "-";
    return format(date, "dd/MM/yyyy", { locale: fr });
  };

  const getDaysCount = () => {
    if (!summary.minDate || !summary.maxDate) return null;
    const diffTime = Math.abs(summary.maxDate.getTime() - summary.minDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const daysCount = getDaysCount();

  return (
    <div className="bg-muted/50 rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2">
        <CheckCircle className="h-5 w-5 text-lavcom-green" />
        <h4 className="font-medium text-foreground">Récapitulatif avant import</h4>
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="flex items-center gap-3 bg-background/50 rounded-lg p-3">
          <Calendar className="h-5 w-5 text-lavcom-green shrink-0" />
          <div>
            <p className="text-muted-foreground text-xs">Période couverte</p>
            <p className="font-medium">
              {formatDate(summary.minDate)} → {formatDate(summary.maxDate)}
            </p>
            {daysCount && (
              <p className="text-xs text-muted-foreground">{daysCount} jour{daysCount > 1 ? 's' : ''}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 bg-background/50 rounded-lg p-3">
          <Euro className="h-5 w-5 text-lavcom-green shrink-0" />
          <div>
            <p className="text-muted-foreground text-xs">Total des montants</p>
            <p className="font-semibold text-lg">{summary.totalAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-background/50 rounded-lg p-3">
          <Hash className="h-5 w-5 text-lavcom-green shrink-0" />
          <div>
            <p className="text-muted-foreground text-xs">Nombre de transactions</p>
            <p className="font-semibold text-lg text-lavcom-green">{summary.validRows.toLocaleString('fr-FR')}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-background/50 rounded-lg p-3">
          <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
          <div>
            <p className="text-muted-foreground text-xs">Total lignes fichier</p>
            <p className="font-medium">{summary.totalRows.toLocaleString('fr-FR')}</p>
            {summary.invalidRows > 0 && (
              <p className="text-xs text-amber-600">dont {summary.invalidRows} ignorée{summary.invalidRows > 1 ? 's' : ''}</p>
            )}
          </div>
        </div>
      </div>

      {summary.invalidRows > 0 && (
        <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 p-3 rounded-lg">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <p className="text-xs">
            {summary.invalidRows} ligne{summary.invalidRows > 1 ? 's' : ''} incomplète{summary.invalidRows > 1 ? 's' : ''} (date ou montant manquant) : elle{summary.invalidRows > 1 ? 's' : ''} sera{summary.invalidRows > 1 ? 'ont' : ''} ignorée{summary.invalidRows > 1 ? 's' : ''} lors de l'import.
          </p>
        </div>
      )}
    </div>
  );
}
