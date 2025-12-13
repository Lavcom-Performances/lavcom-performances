import { useState, useCallback } from "react";
import { Upload, FileText, X, CheckCircle2, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface CSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: (count: number) => void;
}

export function CSVImportDialog({ open, onOpenChange, onImportComplete }: CSVImportDialogProps) {
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; count: number } | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      setSelectedFile(file);
      setImportResult(null);
    } else {
      toast({
        title: "Format non supporté",
        description: "Veuillez sélectionner un fichier CSV ou Excel.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setImportResult(null);
    }
  }, []);

  const handleImport = useCallback(async () => {
    if (!selectedFile) return;

    setIsImporting(true);

    // TODO: Implement actual CSV parsing and import logic
    // For V1, we simulate the import process
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Simulated result
    const simulatedCount = Math.floor(Math.random() * 50) + 10;
    
    setImportResult({ success: true, count: simulatedCount });
    setIsImporting(false);

    toast({
      title: "Import terminé",
      description: `${simulatedCount} opérations ajoutées / mises à jour.`,
    });

    onImportComplete?.(simulatedCount);
  }, [selectedFile, toast, onImportComplete]);

  const handleClose = useCallback(() => {
    setSelectedFile(null);
    setImportResult(null);
    setIsImporting(false);
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-lavcom-green" />
            Importer un fichier CSV
          </DialogTitle>
          <DialogDescription>
            Importez les fichiers CSV exportés depuis votre centrale de paiement. Format actuel : export LM Control / format standard Lavcom Analytics.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drop zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors
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
                  onClick={() => {
                    setSelectedFile(null);
                    setImportResult(null);
                  }}
                  className="ml-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="font-medium text-foreground mb-1">
                  Glissez-déposez votre fichier ici
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  ou
                </p>
                <label htmlFor="csv-upload">
                  <input
                    id="csv-upload"
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button variant="outline" asChild className="cursor-pointer">
                    <span>Choisir un fichier…</span>
                  </Button>
                </label>
              </>
            )}
          </div>

          {/* Import result */}
          {importResult && (
            <div className={`
              flex items-center gap-3 p-4 rounded-lg
              ${importResult.success 
                ? "bg-lavcom-green/10 text-lavcom-green-dark" 
                : "bg-destructive/10 text-destructive"
              }
            `}>
              {importResult.success ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <AlertCircle className="h-5 w-5" />
              )}
              <span className="font-medium">
                {importResult.success 
                  ? `Import terminé : ${importResult.count} opérations ajoutées / mises à jour.`
                  : "Erreur lors de l'import"
                }
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={handleClose}>
              {importResult ? "Fermer" : "Annuler"}
            </Button>
            {!importResult && (
              <Button
                onClick={handleImport}
                disabled={!selectedFile || isImporting}
                className="bg-lavcom-green hover:bg-lavcom-green-dark text-white"
              >
                {isImporting ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Import en cours...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Importer
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
