import { useState, useCallback, useMemo, useEffect } from "react";
import { Upload, ArrowLeft, ArrowRight, Loader2, AlertCircle, CheckCircle } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useSites } from "@/hooks/useSites";
import { useOperationsImport } from "@/hooks/useOperationsImport";
import { useImportRateLimit } from "@/hooks/useImportRateLimit";

import { CSVDropZone } from "./csv-import/CSVDropZone";
import { CSVPreviewTable } from "./csv-import/CSVPreviewTable";
import { CSVImportSummary } from "./csv-import/CSVImportSummary";
import { CSVImportResult } from "./csv-import/CSVImportResult";
import { SiteSelector } from "./csv-import/SiteSelector";
import { ErrorRowsEditor } from "./csv-import/ErrorRowsEditor";
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
import {
  detectEventsFormat,
  parseEventsCSV,
  calculateEventsSummary,
  EventsParsedRow,
} from "./csv-import/eventsParser";

type ImportStep = "upload" | "preview" | "result";
type CSVFormat = "standard" | "events";

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
  const [detectedFormat, setDetectedFormat] = useState<CSVFormat>("standard");
  
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
  
  // Events format parsed rows (bypasses standard mapping)
  const [eventsParsedRows, setEventsParsedRows] = useState<EventsParsedRow[]>([]);
  
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

  // Computed values - use Events rows if format is Events, otherwise standard parsing
  const parsedRows = useMemo(() => {
    if (detectedFormat === "events") {
      return eventsParsedRows;
    }
    if (rows.length === 0 || (mapping.date === null && mapping.amount === null)) {
      return [];
    }
    return parseRows(rows, mapping);
  }, [rows, mapping, detectedFormat, eventsParsedRows]);

  const summary = useMemo(() => {
    if (detectedFormat === "events") {
      return calculateEventsSummary(eventsParsedRows);
    }
    return calculateSummary(parsedRows);
  }, [parsedRows, detectedFormat, eventsParsedRows]);

  const canProceedToPreview = selectedFile !== null && selectedSiteId !== null;
  
  // For Events format, we can import as soon as there are valid rows (no manual mapping needed)
  const canImport = detectedFormat === "events" 
    ? summary.validRows > 0 
    : mapping.date !== null && mapping.amount !== null && summary.validRows > 0;

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
    setEventsParsedRows([]);
    setDetectedFormat("standard");
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
      
      // First, check if this is an Events format CSV
      if (detectEventsFormat(text)) {
        console.log("Detected Events CSV format");
        const eventsRows = parseEventsCSV(text);
        
        if (eventsRows.length === 0) {
          toast({
            title: "Fichier vide",
            description: "Le fichier ne contient aucune transaction de vente (type 'vend').",
            variant: "destructive",
          });
          return;
        }
        
        // Validate line count
        const lineValidation = validateLines(eventsRows.length);
        if (!lineValidation.valid && lineValidation.errorKey) {
          setValidationError(showFileError(lineValidation.errorKey));
          return;
        }
        
        setDetectedFormat("events");
        setEventsParsedRows(eventsRows);
        setCurrentStep("preview");
        return;
      }
      
      // Standard CSV parsing
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

      setDetectedFormat("standard");
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

  const handleRowsChange = useCallback((updatedRows: string[][]) => {
    setRows(updatedRows);
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
    setEventsParsedRows([]);
    setDetectedFormat("standard");
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
        return detectedFormat === "events" 
          ? "Format Events détecté" 
          : "Vérifiez le mapping";
      case "result":
        return "Résultat de l'import";
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case "upload":
        return "Importez les fichiers CSV exportés depuis votre centrale de paiement. Formats supportés : Events, LM Control.";
      case "preview":
        return detectedFormat === "events"
          ? "Le format Events a été automatiquement reconnu. Les montants sont convertis de centimes en euros."
          : "Vérifiez que les colonnes sont bien associées aux bons champs. Ajustez si nécessaire.";
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
              {/* Events format auto-detected banner */}
              {detectedFormat === "events" && (
                <Alert className="border-lavcom-green/50 bg-lavcom-green/10">
                  <CheckCircle className="h-4 w-4 text-lavcom-green" />
                  <AlertDescription className="text-foreground">
                    <span className="font-medium">Format Events détecté automatiquement</span>
                    <span className="mx-2">•</span>
                    <Badge variant="secondary" className="mr-2">CB / ESP</Badge>
                    <Badge variant="secondary">Centimes → Euros</Badge>
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Standard format: show mapping table */}
              {detectedFormat === "standard" && (
                <CSVPreviewTable
                  columns={columns}
                  mapping={mapping}
                  onMappingChange={handleMappingChange}
                  previewRows={rows}
                />
              )}
              
              {/* Events format: show preview of parsed data */}
              {detectedFormat === "events" && eventsParsedRows.length > 0 && (
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    Aperçu des {Math.min(5, eventsParsedRows.length)} premières lignes :
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium">Date</th>
                            <th className="px-3 py-2 text-left font-medium">Heure</th>
                            <th className="px-3 py-2 text-left font-medium">Machine</th>
                            <th className="px-3 py-2 text-left font-medium">Mode</th>
                            <th className="px-3 py-2 text-right font-medium">Prix €</th>
                          </tr>
                        </thead>
                        <tbody>
                          {eventsParsedRows.slice(0, 5).map((row, idx) => (
                            <tr key={idx} className="border-t">
                              <td className="px-3 py-2">
                                {row.date ? row.date.toLocaleDateString('fr-FR') : '-'}
                              </td>
                              <td className="px-3 py-2">{row.time || '-'}</td>
                              <td className="px-3 py-2">{row.machine || '-'}</td>
                              <td className="px-3 py-2">
                                <Badge variant={row.paymentMode === 'CB' ? 'default' : 'secondary'}>
                                  {row.paymentMode || '-'}
                                </Badge>
                              </td>
                              <td className="px-3 py-2 text-right font-medium">
                                {row.amount?.toFixed(2)} €
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Error rows editor - only for standard format */}
              {detectedFormat === "standard" && summary.invalidRows > 0 && (
                <ErrorRowsEditor
                  rows={rows}
                  mapping={mapping}
                  parsedRows={parsedRows}
                  onRowsChange={handleRowsChange}
                />
              )}

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
