import { CheckCircle2, AlertCircle, AlertTriangle, ArrowDown, RotateCcw, FileCheck, FileX, Files, Ban } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ImportResult } from "./types";
import { Button } from "@/components/ui/button";

interface CSVImportResultProps {
  result: ImportResult;
  onClose: () => void;
  onRetry?: () => void;
  onScrollToTable?: () => void;
}

// Calculate total lines read from result
function getTotalRead(result: ImportResult): number {
  return result.imported + result.ignored + result.duplicates + result.errors.length;
}

// Determine import status
function getImportStatus(result: ImportResult): 'success' | 'partial' | 'failed' {
  const hasErrors = result.errors.length > 0;
  const hasImported = result.imported > 0;
  
  if (!hasErrors) return 'success';
  if (hasImported) return 'partial';
  return 'failed';
}

export function CSVImportResult({ result, onClose, onRetry, onScrollToTable }: CSVImportResultProps) {
  const { t } = useTranslation("app");
  const status = getImportStatus(result);
  const totalRead = getTotalRead(result);
  const hasErrors = result.errors.length > 0;
  const hasDuplicates = result.duplicates > 0;
  
  // Status config
  const statusConfig = {
    success: {
      icon: CheckCircle2,
      title: t("csvImport.success"),
      bgColor: "bg-lavcom-green/10",
      textColor: "text-lavcom-green-dark dark:text-lavcom-green",
      iconColor: "text-lavcom-green",
    },
    partial: {
      icon: AlertTriangle,
      title: t("csvImport.partial"),
      bgColor: "bg-amber-50 dark:bg-amber-900/20",
      textColor: "text-amber-800 dark:text-amber-300",
      iconColor: "text-amber-600 dark:text-amber-400",
    },
    failed: {
      icon: AlertCircle,
      title: t("csvImport.failed"),
      bgColor: "bg-destructive/10",
      textColor: "text-destructive",
      iconColor: "text-destructive",
    },
  };
  
  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <div className="space-y-4">
      {/* Status header */}
      <div className={`flex items-center gap-3 p-4 rounded-lg ${config.bgColor}`}>
        <StatusIcon className={`h-6 w-6 shrink-0 ${config.iconColor}`} />
        <p className={`font-semibold ${config.textColor}`}>{config.title}</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border/50">
          <Files className="h-4 w-4 text-muted-foreground shrink-0" />
          <div>
            <p className="text-lg font-semibold">{totalRead}</p>
            <p className="text-xs text-muted-foreground">{t("csvImport.linesRead")}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 p-3 rounded-lg bg-lavcom-green/10 border border-lavcom-green/20">
          <FileCheck className="h-4 w-4 text-lavcom-green shrink-0" />
          <div>
            <p className="text-lg font-semibold text-lavcom-green-dark dark:text-lavcom-green">{result.imported}</p>
            <p className="text-xs text-muted-foreground">{t("csvImport.linesImported")}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border/50">
          <Ban className="h-4 w-4 text-muted-foreground shrink-0" />
          <div>
            <p className="text-lg font-semibold">{result.duplicates}</p>
            <p className="text-xs text-muted-foreground">{t("csvImport.duplicatesIgnored")}</p>
          </div>
        </div>
        
        <div className={`flex items-center gap-2 p-3 rounded-lg border ${
          hasErrors 
            ? "bg-destructive/10 border-destructive/20" 
            : "bg-muted/50 border-border/50"
        }`}>
          <FileX className={`h-4 w-4 shrink-0 ${hasErrors ? "text-destructive" : "text-muted-foreground"}`} />
          <div>
            <p className={`text-lg font-semibold ${hasErrors ? "text-destructive" : ""}`}>{result.errors.length}</p>
            <p className="text-xs text-muted-foreground">{t("csvImport.errors")}</p>
          </div>
        </div>
      </div>

      {/* Duplicates message */}
      {hasDuplicates && (
        <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
          {t("csvImport.duplicatesMessage", { count: result.duplicates })}
        </p>
      )}

      {/* Errors section */}
      {hasErrors && (
        <div className="bg-destructive/5 rounded-lg p-3 border border-destructive/20">
          <p className="text-sm font-medium text-destructive mb-2">
            {t("csvImport.errorsMessage")}
          </p>
          {result.errors.length > 0 && (
            <ul className="text-xs text-muted-foreground space-y-1">
              {result.errors.slice(0, 3).map((error, i) => (
                <li key={i} className="truncate">• {error}</li>
              ))}
              {result.errors.length > 3 && (
                <li className="text-muted-foreground/70 italic">
                  {t("csvImport.andMore", { count: result.errors.length - 3, plural: result.errors.length - 3 > 1 ? 's' : '' })}
                </li>
              )}
            </ul>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 justify-between items-center pt-2">
        {status === 'failed' ? (
          <Button variant="outline" onClick={onRetry} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            {t("csvImport.retry")}
          </Button>
        ) : (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onScrollToTable}
            className="text-lavcom-green border-lavcom-green/30 hover:bg-lavcom-green/10 gap-1.5"
          >
            <ArrowDown className="h-4 w-4" />
            {t("csvImport.viewNewRows")}
          </Button>
        )}
        <Button onClick={onClose}>
          {t("csvImport.close")}
        </Button>
      </div>
    </div>
  );
}
