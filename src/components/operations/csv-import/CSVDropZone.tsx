import { useCallback } from "react";
import { Upload, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CSVDropZoneProps {
  selectedFile: File | null;
  isDragging: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearFile: () => void;
}

export function CSVDropZone({
  selectedFile,
  isDragging,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileSelect,
  onClearFile,
}: CSVDropZoneProps) {
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`
        border-2 border-dashed rounded-lg p-6 text-center transition-colors
        ${isDragging 
          ? "border-lavcom-green bg-lavcom-green/10" 
          : "border-border hover:border-lavcom-green/50"
        }
        ${selectedFile ? "bg-muted/50" : ""}
      `}
    >
      {selectedFile ? (
        <div className="flex items-center justify-center gap-3">
          <FileText className="h-8 w-8 text-lavcom-green" />
          <div className="text-left">
            <p className="font-medium text-foreground">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground">
              {(selectedFile.size / 1024).toFixed(1)} Ko
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClearFile}
            className="ml-2"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <>
          <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium text-foreground mb-1">
            Glissez-déposez votre fichier CSV ici
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            ou
          </p>
          <label htmlFor="csv-upload">
            <input
              id="csv-upload"
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={onFileSelect}
              className="hidden"
            />
            <Button variant="outline" asChild className="cursor-pointer">
              <span>Choisir un fichier…</span>
            </Button>
          </label>
        </>
      )}
    </div>
  );
}
