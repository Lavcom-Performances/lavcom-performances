import { useCallback } from "react";
import { Upload, File, X, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileWithMeta } from "./types";
import { cn } from "@/lib/utils";

interface MultiCSVUploadStepProps {
  files: FileWithMeta[];
  onFilesAdd: (files: File[]) => void;
  onFileRemove: (fileId: string) => void;
  isProcessing: boolean;
}

export function MultiCSVUploadStep({
  files,
  onFilesAdd,
  onFileRemove,
  isProcessing,
}: MultiCSVUploadStepProps) {
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const droppedFiles = Array.from(e.dataTransfer.files).filter(
        (f) => f.name.endsWith(".csv") || f.type === "text/csv"
      );
      if (droppedFiles.length > 0) {
        onFilesAdd(droppedFiles);
      }
    },
    [onFilesAdd]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = e.target.files;
      if (selectedFiles) {
        const csvFiles = Array.from(selectedFiles).filter(
          (f) => f.name.endsWith(".csv") || f.type === "text/csv"
        );
        if (csvFiles.length > 0) {
          onFilesAdd(csvFiles);
        }
      }
      // Reset input
      e.target.value = "";
    },
    [onFilesAdd]
  );

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-xl p-8 md:p-12 text-center transition-all",
          "hover:border-primary hover:bg-primary/5",
          files.length > 0 ? "border-border" : "border-primary/50 bg-primary/5"
        )}
      >
        <Upload className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="font-semibold text-foreground mb-2 text-lg">
          Glissez vos fichiers CSV ici
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          ou cliquez pour sélectionner plusieurs fichiers
        </p>
        <label htmlFor="csv-multi-upload">
          <Button variant="outline" asChild className="cursor-pointer">
            <span>
              <FileText className="h-4 w-4 mr-2" />
              Sélectionner des fichiers
            </span>
          </Button>
        </label>
        <input
          id="csv-multi-upload"
          type="file"
          accept=".csv,text/csv"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
        <p className="text-xs text-muted-foreground mt-4">
          Format accepté : CSV (LM Control)
        </p>
      </div>

      {/* Files list */}
      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-foreground">
              {files.length} fichier{files.length > 1 ? "s" : ""} sélectionné
              {files.length > 1 ? "s" : ""}
            </h4>
            {isProcessing && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyse en cours...
              </div>
            )}
          </div>
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
            {files.map((fileItem) => (
              <div
                key={fileItem.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <File className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm truncate">
                    {fileItem.file.name}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatFileSize(fileItem.file.size)}</span>
                    {fileItem.status === "parsing" && (
                      <span className="flex items-center gap-1 text-primary">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Analyse...
                      </span>
                    )}
                    {fileItem.status === "ready" && fileItem.summary && (
                      <span className="text-green-600 dark:text-green-400">
                        {fileItem.summary.validRows} lignes valides
                      </span>
                    )}
                    {fileItem.status === "error" && (
                      <span className="text-destructive">{fileItem.error}</span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onFileRemove(fileItem.id)}
                  className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
                  disabled={isProcessing}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
