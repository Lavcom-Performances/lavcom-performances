import { useState, useCallback, useMemo, useEffect } from "react";
import { Upload, ArrowLeft, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useSites } from "@/hooks/useSites";
import { useOperationsImport } from "@/hooks/useOperationsImport";
import { useImportRateLimit } from "@/hooks/useImportRateLimit";

import { CSVDropZone } from "./csv-import/CSVDropZone";
import { CSVPreviewTable } from "./csv-import/CSVPreviewTable";
import { CSVImportSummary } from "./csv-import/CSVImportSummary";
import { CSVImportResult } from "./csv-import/CSVImportResult";
import { SiteSelector } from "./csv-import/SiteSelector";
import {
  CSVColumn,
  ColumnMapping,
  ParsedRow,
  ImportResult,
} from "./csv-import/types";
import {
  parseCSVToColumns,
  autoDetectMapping,
  parseRows,
  calculateSummary,
} from "./csv-import/csvParser";

type ImportStep = "upload" | "preview" | "result";

interface CSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: (count: number) => void;
}

export function CSVImportDialog({ open, onOpenChange, onImportComplete }: CSVImportDialogProps) {
  const { toast } = useToast();
  const { t } = useTranslation("app");
  const { sites, isLoading: sitesLoading, createSite, getDefaultSite } = useSites();
  const { importOperations, isImporting } = useOperationsImport();
  const { validateFile, validateLines, checkRateLimit, showFileError, isChecking, limits } = useImportRateLimit();
  
  // Step management
  const [currentStep, setCurrentStep] = useState<ImportStep>("upload");
  
  // File state
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  
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
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Set default site when sites load
  useEffect(() => {
    if (!selectedSiteId && sites.length > 0) {
      const defaultSite = getDefaultSite();
      if (defaultSite) {
        setSelectedSiteId(defaultSite.id);
      }
    }
  }, [sites, selectedSiteId, getDefaultSite]);

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

  const canProceedToPreview = selectedFile !== null && selectedSiteId !== null;
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
    setValidationError(null);
    
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      // Validate file size
      const validation = validateFile(file);
      if (!validation.valid && validation.errorKey) {
        setValidationError(showFileError(validation.errorKey));
        return;
      }
      setSelectedFile(file);
    } else {
      toast({
        title: "Format non supporté",
        description: t("csvImport.fileTypeError"),
        variant: "destructive",
      });
    }
  }, [toast, t, validateFile, showFileError]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setValidationError(null);
      // Validate file size
      const validation = validateFile(file);
      if (!validation.valid && validation.errorKey) {
        setValidationError(showFileError(validation.errorKey));
        return;
      }
      setSelectedFile(file);
    }
  }, [validateFile, showFileError]);

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
    setValidationError(null);
  }, []);

  const handleCreateSite = useCallback(async (name: string) => {
    const newSite = await createSite({ name });
    return newSite;
  }, [createSite]);

  const handleProceedToPreview = useCallback(async () => {
    if (!selectedFile) return;
    setValidationError(null);

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

      // Validate line count
      const lineValidation = validateLines(parsedRows.length);
      if (!lineValidation.valid && lineValidation.errorKey) {
        setValidationError(showFileError(lineValidation.errorKey));
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
  }, [selectedFile, toast, validateLines, showFileError]);

  const handleMappingChange = useCallback((columnType: keyof ColumnMapping, columnIndex: number | null) => {
    setMapping((prev) => ({
      ...prev,
      [columnType]: columnIndex,
    }));
  }, []);

  const handleImport = useCallback(async () => {
    if (!canImport || !selectedSiteId || !selectedFile) {
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

    // Check server-side rate limit before importing
    const rateLimitResult = await checkRateLimit(selectedSiteId, selectedFile.name);
    if (!rateLimitResult.allowed) {
      setValidationError(rateLimitResult.error || t("csvImport.frequencyError", { time: rateLimitResult.cooldownFormatted }));
      toast({
        title: t("rateLimit.import_csv.title"),
        description: rateLimitResult.error,
        variant: "destructive",
      });
      return;
    }

    const result = await importOperations(selectedSiteId, selectedFile.name, parsedRows);

    setImportResult(result);
    setCurrentStep("result");

    if (result.success) {
      toast({
        title: "Import terminé",
        description: `${result.imported} opérations importées.`,
      });
      onImportComplete?.(result.imported);
    } else {
      toast({
        title: "Erreur lors de l'import",
        description: result.errors[0] || "Une erreur est survenue.",
        variant: "destructive",
      });
    }
  }, [canImport, selectedSiteId, selectedFile, mapping, parsedRows, importOperations, toast, onImportComplete, checkRateLimit, t]);

  const handleClose = useCallback(() => {
    // Reset all state
    setCurrentStep("upload");
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
    setImportResult(null);
    setValidationError(null);
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
                sites={sites}
                selectedSiteId={selectedSiteId}
                onSiteChange={setSelectedSiteId}
                onCreateSite={handleCreateSite}
                isLoading={sitesLoading}
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

              {/* Validation error inline */}
              {validationError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{validationError}</AlertDescription>
                </Alert>
              )}

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

              {/* Validation error inline */}
              {validationError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{validationError}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={handleBack}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={!canImport || isImporting || isChecking}
                  className="bg-lavcom-green hover:bg-lavcom-green-dark text-white"
                >
                  {isChecking ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t("csvImport.validating")}
                    </>
                  ) : isImporting ? (
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
