import {
  CheckCircle2,
  XCircle,
  Loader2,
  FileText,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FileWithMeta } from "./types";
import { cn } from "@/lib/utils";

interface MultiCSVImportStepProps {
  files: FileWithMeta[];
  isImporting: boolean;
  importProgress: number;
  currentFileIndex: number;
  onRetryFile: (fileId: string) => void;
}

export function MultiCSVImportStep({
  files,
  isImporting,
  importProgress,
  currentFileIndex,
  onRetryFile,
}: MultiCSVImportStepProps) {
  const successFiles = files.filter((f) => f.status === "success");
  const errorFiles = files.filter((f) => f.status === "error");
  const pendingFiles = files.filter(
    (f) => f.status === "ready" || f.status === "importing"
  );

  const totalImported = successFiles.reduce(
    (sum, f) => sum + (f.importResult?.imported || 0),
    0
  );
  const totalIgnored = successFiles.reduce(
    (sum, f) => sum + (f.importResult?.ignored || 0),
    0
  );

  const isComplete = !isImporting && pendingFiles.length === 0;

  return (
    <div className="space-y-6">
      {/* Global progress */}
      {isImporting && (
        <div className="space-y-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="font-medium text-foreground">
                Import en cours...
              </span>
            </div>
            <span className="text-sm text-muted-foreground">
              {currentFileIndex + 1} / {files.length}
            </span>
          </div>
          <Progress value={importProgress} className="h-2" />
        </div>
      )}

      {/* Complete summary */}
      {isComplete && (
        <div
          className={cn(
            "p-4 rounded-xl border",
            errorFiles.length > 0
              ? "bg-amber-500/5 border-amber-500/30"
              : "bg-green-500/5 border-green-500/30"
          )}
        >
          <div className="flex items-center gap-3 mb-3">
            {errorFiles.length > 0 ? (
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            )}
            <span className="font-semibold text-foreground">
              {errorFiles.length > 0
                ? `${successFiles.length} fichier${successFiles.length > 1 ? "s" : ""} importé${successFiles.length > 1 ? "s" : ""}, ${errorFiles.length} en erreur`
                : `Import terminé avec succès`}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div className="p-3 rounded-lg bg-background border border-border">
              <div className="text-2xl font-bold text-foreground">
                {successFiles.length}
              </div>
              <div className="text-muted-foreground">Fichiers importés</div>
            </div>
            <div className="p-3 rounded-lg bg-background border border-border">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {totalImported.toLocaleString()}
              </div>
              <div className="text-muted-foreground">Opérations créées</div>
            </div>
            {totalIgnored > 0 && (
              <div className="p-3 rounded-lg bg-background border border-border">
                <div className="text-2xl font-bold text-muted-foreground">
                  {totalIgnored.toLocaleString()}
                </div>
                <div className="text-muted-foreground">Lignes ignorées</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Files detail */}
      <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
        {files.map((fileItem, index) => (
          <div
            key={fileItem.id}
            className={cn(
              "p-4 rounded-xl border transition-all",
              fileItem.status === "success" &&
                "border-green-500/30 bg-green-500/5",
              fileItem.status === "error" &&
                "border-destructive/30 bg-destructive/5",
              fileItem.status === "importing" &&
                "border-primary/30 bg-primary/5",
              (fileItem.status === "ready" || fileItem.status === "pending") &&
                "border-border bg-card"
            )}
          >
            <div className="flex items-center gap-3">
              {/* Status icon */}
              <div className="shrink-0">
                {fileItem.status === "success" && (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                )}
                {fileItem.status === "error" && (
                  <XCircle className="h-5 w-5 text-destructive" />
                )}
                {fileItem.status === "importing" && (
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                )}
                {(fileItem.status === "ready" ||
                  fileItem.status === "pending") && (
                  <FileText className="h-5 w-5 text-muted-foreground" />
                )}
              </div>

              {/* File info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm truncate">
                  {fileItem.file.name}
                </p>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-xs text-muted-foreground">
                  <span>→ {fileItem.siteName || "Non assigné"}</span>
                  {fileItem.status === "success" && fileItem.importResult && (
                    <>
                      <span>•</span>
                      <span className="text-green-600 dark:text-green-400">
                        {fileItem.importResult.imported} importées
                      </span>
                      {fileItem.importResult.ignored > 0 && (
                        <>
                          <span>•</span>
                          <span>{fileItem.importResult.ignored} ignorées</span>
                        </>
                      )}
                    </>
                  )}
                  {fileItem.status === "error" && (
                    <span className="text-destructive">{fileItem.error}</span>
                  )}
                </div>
              </div>

              {/* Retry button */}
              {fileItem.status === "error" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRetryFile(fileItem.id)}
                  className="shrink-0"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Réessayer
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
