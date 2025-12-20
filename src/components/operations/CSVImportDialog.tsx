import { useState, useCallback, useMemo } from "react";
import { Upload, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

import { CSVDropZone } from "./csv-import/CSVDropZone";
import { CSVPreviewTable } from "./csv-import/CSVPreviewTable";
import { CSVImportSummary } from "./csv-import/CSVImportSummary";
import { CSVImportResult } from "./csv-import/CSVImportResult";
import { SiteSelector } from "./csv-import/SiteSelector";
import {
  CSVColumn,
  ColumnMapping,
  ParsedRow,
  ImportSummary,
  ImportResult,
} from "./csv-import/types";
import {
  parseCSVToColumns,
  autoDetectMapping,
  parseRows,
  calculateSummary,
} from "./csv-import/csvParser";

// Mock sites for V1
const MOCK_SITES = [
  { id: "1", name: "Laverie Principale" },
];

type ImportStep = "upload" | "preview" | "result";

interface CSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: (count: number) => void;
}

export function CSVImportDialog({ open, onOpenChange, onImportComplete }: CSVImportDialogProps) {
  const { toast } = useToast();
  
  // Step management
  const [currentStep, setCurrentStep] = useState<ImportStep>("upload");
  
  // File state
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(
    MOCK_SITES.length === 1 ? MOCK_SITES[0].id : null
  );
  
  // CSV parsing state
  const [columns, setColumns] = useState<CSVColumn[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    date: null,
    time: null,
    amount: null,
    machine: null,
    program: null,
    paymentMode: null,
  });
  
  // Import state
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // Computed values
  const parsedRows = useMemo(() => {
    if (rows.length === 0 || (mapping.date === null && mapping.amount === null)) {
      return [];
    }
    return parseRows(rows, mapping);
  }, [rows, mapping]);

  const summary = useMemo(() => {
    return calculateSummary(parsedRows);
  }, [parsedRows]);

  const canProceedToPreview = selectedFile !== null && (MOCK_SITES.length === 1 || selectedSiteId !== null);
  const canImport = mapping.date !== null && mapping.amount !== null && summary.validRows > 0;

  // Event handlers
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
    } else {
      toast({
        title: "Format non supporté",
        description: "Veuillez sélectionner un fichier CSV.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  }, []);

  const handleClearFile = useCallback(() => {
    setSelectedFile(null);
    setColumns([]);
    setRows([]);
    setMapping({
      date: null,
      time: null,
      amount: null,
      machine: null,
      program: null,
      paymentMode: null,
    });
  }, []);

  const handleProceedToPreview = useCallback(async () => {
    if (!selectedFile) return;

    try {
      const text = await selectedFile.text();
      const { columns: parsedColumns, rows: parsedRows } = parseCSVToColumns(text);
      
      if (parsedColumns.length === 0) {
        toast({
          title: "Fichier vide",
          description: "Le fichier ne contient pas de données exploitables.",
          variant: "destructive",
        });
        return;
      }

      setColumns(parsedColumns);
      setRows(parsedRows);
      
      // Auto-detect mapping
      const autoMapping = autoDetectMapping(parsedColumns);
      setMapping(autoMapping);
      
      setCurrentStep("preview");
    } catch (error) {
      toast({
        title: "Erreur de lecture",
        description: "Impossible de lire le fichier. Vérifiez qu'il s'agit bien d'un CSV.",
        variant: "destructive",
      });
    }
  }, [selectedFile, toast]);

  const handleMappingChange = useCallback((columnType: keyof ColumnMapping, columnIndex: number | null) => {
    setMapping((prev) => ({
      ...prev,
      [columnType]: columnIndex,
    }));
  }, []);

  const handleImport = useCallback(async () => {
    if (!canImport) {
      if (mapping.date === null) {
        toast({
          title: "Colonne date manquante",
          description: "On n'arrive pas à lire la date. Sélectionnez la bonne colonne ou vérifiez le format (ex : 18/03/2025).",
          variant: "destructive",
        });
        return;
      }
      if (mapping.amount === null) {
        toast({
          title: "Colonne montant manquante",
          description: "Sélectionnez la colonne contenant les montants pour continuer.",
          variant: "destructive",
        });
        return;
      }
      return;
    }

    setIsImporting(true);

    // TODO: Implement actual import to database
    // For V1, we simulate the import process
    await new Promise(resolve => setTimeout(resolve, 1500));

    const result: ImportResult = {
      success: true,
      imported: summary.validRows,
      ignored: summary.invalidRows,
      errors: summary.invalidRows > 0 
        ? [`${summary.invalidRows} lignes ignorées (données incomplètes)`]
        : [],
    };

    setImportResult(result);
    setCurrentStep("result");
    setIsImporting(false);

    toast({
      title: "Import terminé",
      description: `${result.imported} opérations importées.`,
    });

    onImportComplete?.(result.imported);
  }, [canImport, mapping, summary, toast, onImportComplete]);

  const handleClose = useCallback(() => {
    // Reset all state
    setCurrentStep("upload");
    setSelectedFile(null);
    setSelectedSiteId(MOCK_SITES.length === 1 ? MOCK_SITES[0].id : null);
    setColumns([]);
    setRows([]);
    setMapping({
      date: null,
      time: null,
      amount: null,
      machine: null,
      program: null,
      paymentMode: null,
    });
    setImportResult(null);
    setIsImporting(false);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleBack = useCallback(() => {
    if (currentStep === "preview") {
      setCurrentStep("upload");
    }
  }, [currentStep]);

  const getStepTitle = () => {
    switch (currentStep) {
      case "upload":
        return "Importer un fichier CSV";
      case "preview":
        return "Vérifiez le mapping";
      case "result":
        return "Résultat de l'import";
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case "upload":
        return "Importez les fichiers CSV exportés depuis votre centrale de paiement. Format actuel : export LM Control.";
      case "preview":
        return "Vérifiez que les colonnes sont bien associées aux bons champs. Ajustez si nécessaire.";
      case "result":
        return "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-lavcom-green" />
            {getStepTitle()}
          </DialogTitle>
          {getStepDescription() && (
            <DialogDescription>
              {getStepDescription()}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4">
          {/* Step: Upload */}
          {currentStep === "upload" && (
            <>
              <SiteSelector
                sites={MOCK_SITES}
                selectedSiteId={selectedSiteId}
                onSiteChange={setSelectedSiteId}
              />
              
              <CSVDropZone
                selectedFile={selectedFile}
                isDragging={isDragging}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onFileSelect={handleFileSelect}
                onClearFile={handleClearFile}
              />

              <div className="flex justify-end">
                <Button
                  onClick={handleProceedToPreview}
                  disabled={!canProceedToPreview}
                  className="bg-lavcom-green hover:bg-lavcom-green-dark text-white"
                >
                  Continuer
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </>
          )}

          {/* Step: Preview & Mapping */}
          {currentStep === "preview" && (
            <>
              <CSVPreviewTable
                columns={columns}
                mapping={mapping}
                onMappingChange={handleMappingChange}
                previewRows={rows}
              />

              {summary.validRows > 0 && (
                <CSVImportSummary summary={summary} />
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={handleBack}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={!canImport || isImporting}
                  className="bg-lavcom-green hover:bg-lavcom-green-dark text-white"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Import en cours...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Lancer l'import ({summary.validRows} lignes)
                    </>
                  )}
                </Button>
              </div>
            </>
          )}

          {/* Step: Result */}
          {currentStep === "result" && importResult && (
            <CSVImportResult result={importResult} onClose={handleClose} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
