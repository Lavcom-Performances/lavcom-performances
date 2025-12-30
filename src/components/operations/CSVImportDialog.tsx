import { useState, useCallback, useMemo, useEffect } from "react";
import { Upload, ArrowLeft, ArrowRight, Loader2, AlertCircle, CheckCircle, X, FileText } from "lucide-react";
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

import { SiteSelector } from "./csv-import/SiteSelector";
import { CSVImportResult } from "./csv-import/CSVImportResult";
import { MultiCsvLinesPreview } from "./multi-csv/MultiCsvLinesPreview";
import { MultiCsvSummaryCard } from "./multi-csv/MultiCsvSummaryCard";
import { ImportResult } from "./csv-import/types";
import { MultiCsvParsedRow, MultiCsvFile, MAX_FILES_PER_IMPORT, calculateMultiCsvSummary } from "@/lib/csv/multiCsvTypes";
import { parseMultiCsvFile } from "@/lib/csv/parseMultiCsv";
import { centsToEuros } from "@/lib/csv/parseAmount";

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
  const { validateFile, validateLines, checkRateLimit, showFileError, isChecking } = useImportRateLimit();
  
  // Step management
  const [currentStep, setCurrentStep] = useState<ImportStep>("upload");
  
  // File state - multi-file support
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<MultiCsvFile[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Aggregated rows from all files
  const [allRows, setAllRows] = useState<MultiCsvParsedRow[]>([]);
  
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

  // Calculate summary from all rows
  const summary = useMemo(() => calculateMultiCsvSummary(selectedFiles, allRows), [selectedFiles, allRows]);
  
  // Count selected rows for import
  const selectedRowsCount = useMemo(() => allRows.filter(r => r.selected).length, [allRows]);

  const canProceedToPreview = selectedFiles.length > 0 && selectedSiteId !== null && 
    selectedFiles.some(f => f.status === 'ready');
  
  const canImport = selectedRowsCount > 0;

  // Generate unique ID
  const generateId = () => Math.random().toString(36).substring(2, 15);

  // Process files (parse CSV)
  const processFiles = useCallback(async (files: File[]) => {
    // Check max files limit
    const totalFiles = selectedFiles.length + files.length;
    if (totalFiles > MAX_FILES_PER_IMPORT) {
      toast({
        title: t("csvImport.multi.maxFiles"),
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setValidationError(null);

    const newFiles: MultiCsvFile[] = [];

    for (const file of files) {
      // Validate file type
      if (!file.name.endsWith('.csv')) {
        newFiles.push({
          id: generateId(),
          file,
          status: 'error',
          site_id: null,
          parsed_rows: [],
          total_rows: 0,
          importable_count: 0,
          to_review_count: 0,
          invalid_count: 0,
          error: t("csvImport.fileTypeError"),
          duplicate_warning: null,
        });
        continue;
      }

      // Validate file size
      const validation = validateFile(file);
      if (!validation.valid && validation.errorKey) {
        newFiles.push({
          id: generateId(),
          file,
          status: 'error',
          site_id: null,
          parsed_rows: [],
          total_rows: 0,
          importable_count: 0,
          to_review_count: 0,
          invalid_count: 0,
          error: showFileError(validation.errorKey),
          duplicate_warning: null,
        });
        continue;
      }

      try {
        const text = await file.text();
        const parsedRows = parseMultiCsvFile(file.name, text);

        if (parsedRows.length === 0) {
          newFiles.push({
            id: generateId(),
            file,
            status: 'error',
            site_id: null,
            parsed_rows: [],
            total_rows: 0,
            importable_count: 0,
            to_review_count: 0,
            invalid_count: 0,
            error: "Fichier vide ou format non reconnu",
            duplicate_warning: null,
          });
          continue;
        }

        // Validate line count
        const lineValidation = validateLines(parsedRows.length);
        if (!lineValidation.valid && lineValidation.errorKey) {
          newFiles.push({
            id: generateId(),
            file,
            status: 'error',
            site_id: null,
            parsed_rows: [],
            total_rows: parsedRows.length,
            importable_count: 0,
            to_review_count: 0,
            invalid_count: 0,
            error: showFileError(lineValidation.errorKey),
            duplicate_warning: null,
          });
          continue;
        }

        const importable = parsedRows.filter(r => r.status === 'importable').length;
        const toReview = parsedRows.filter(r => r.status === 'to_review').length;
        const invalid = parsedRows.filter(r => r.status === 'invalid').length;

        newFiles.push({
          id: generateId(),
          file,
          status: 'ready',
          site_id: null,
          parsed_rows: parsedRows,
          total_rows: parsedRows.length,
          importable_count: importable,
          to_review_count: toReview,
          invalid_count: invalid,
          error: null,
          duplicate_warning: null,
        });
      } catch (error) {
        console.error("Error parsing file:", error);
        newFiles.push({
          id: generateId(),
          file,
          status: 'error',
          site_id: null,
          parsed_rows: [],
          total_rows: 0,
          importable_count: 0,
          to_review_count: 0,
          invalid_count: 0,
          error: "Erreur lors de l'analyse du fichier",
          duplicate_warning: null,
        });
      }
    }

    setSelectedFiles(prev => [...prev, ...newFiles]);
    setIsProcessing(false);
  }, [selectedFiles, validateFile, validateLines, showFileError, toast, t]);

  // Remove file
  const removeFile = useCallback((fileId: string) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);

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
    
    const files = Array.from(e.dataTransfer.files).filter(
      f => f.name.endsWith('.csv')
    );
    
    if (files.length > 0) {
      processFiles(files);
    }
  }, [processFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) {
      processFiles(files);
    }
    // Reset input
    e.target.value = '';
  }, [processFiles]);

  const handleCreateSite = useCallback(async (name: string) => {
    const newSite = await createSite({ name });
    return newSite;
  }, [createSite]);

  const handleProceedToPreview = useCallback(() => {
    // Aggregate all rows from ready files
    const aggregatedRows: MultiCsvParsedRow[] = [];
    
    selectedFiles.forEach(file => {
      if (file.status === 'ready') {
        aggregatedRows.push(...file.parsed_rows);
      }
    });

    setAllRows(aggregatedRows);
    setCurrentStep("preview");
  }, [selectedFiles]);

  // Row selection handlers
  const handleRowSelectionChange = useCallback((rowIndex: number, selected: boolean) => {
    setAllRows(prev => prev.map((row, idx) => 
      idx === rowIndex ? { ...row, selected } : row
    ));
  }, []);

  const handleSelectAll = useCallback((status: 'importable' | 'to_review', selected: boolean) => {
    setAllRows(prev => prev.map(row => 
      row.status === status ? { ...row, selected } : row
    ));
  }, []);

  const handleImport = useCallback(async () => {
    if (!canImport || !selectedSiteId) return;

    const selectedRows = allRows.filter(r => r.selected);
    if (selectedRows.length === 0) {
      toast({
        title: "Aucune ligne sélectionnée",
        description: "Sélectionnez au moins une ligne à importer.",
        variant: "destructive",
      });
      return;
    }

    // Check server-side rate limit
    const firstFile = selectedFiles.find(f => f.status === 'ready');
    const filename = firstFile ? firstFile.file.name : 'multi-import';
    
    const rateLimitResult = await checkRateLimit(selectedSiteId, filename);
    if (!rateLimitResult.allowed) {
      setValidationError(rateLimitResult.error || t("csvImport.frequencyError", { time: rateLimitResult.cooldownFormatted }));
      toast({
        title: t("rateLimit.import_csv.title"),
        description: rateLimitResult.error,
        variant: "destructive",
      });
      return;
    }

    // Convert MultiCsvParsedRow to format expected by importOperations
    const parsedRows = selectedRows.map(row => ({
      date: row.date_iso ? new Date(row.date_iso) : undefined,
      time: row.time || undefined,
      amount: row.amount_cents ? centsToEuros(row.amount_cents) ?? undefined : undefined,
      machine: row.machine || undefined,
      program: row.program || undefined,
      paymentMode: row.normalized_mode || undefined,
      isValid: true,
      errors: [],
      rawData: row.raw_data,
      // Extended fields for Events format
      insertedEur: row.inserted_cents ? centsToEuros(row.inserted_cents) ?? undefined : undefined,
      priceEur: row.price_cents ? centsToEuros(row.price_cents) ?? undefined : undefined,
      changeEur: row.change_cents ? centsToEuros(row.change_cents) ?? undefined : undefined,
      machineName: row.machine_name || undefined,
      source: 'events_csv' as const,
    }));

    const result = await importOperations(selectedSiteId, filename, parsedRows);

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
  }, [canImport, selectedSiteId, allRows, selectedFiles, importOperations, toast, onImportComplete, checkRateLimit, t]);

  const handleClose = useCallback(() => {
    setCurrentStep("upload");
    setSelectedFiles([]);
    setAllRows([]);
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
        return "Importer des fichiers CSV";
      case "preview":
        return "Vérifiez les données";
      case "result":
        return "Résultat de l'import";
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case "upload":
        return `Importez jusqu'à ${MAX_FILES_PER_IMPORT} fichiers CSV. Formats supportés : Events, LM Control.`;
      case "preview":
        return "Vérifiez les lignes à importer. Totaux CB+ESP affichés séparément de FI.";
      case "result":
        return "";
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
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
              
              {/* Multi-file drop zone */}
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  isDragging 
                    ? "border-lavcom-green bg-lavcom-green/5" 
                    : "border-border hover:border-lavcom-green/50"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-2">
                  {t("csvImport.multi.dropzone")}
                </p>
                <input
                  type="file"
                  id="csv-multi-upload"
                  multiple
                  accept=".csv,text/csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <label htmlFor="csv-multi-upload">
                  <Button variant="outline" className="cursor-pointer" asChild>
                    <span>Sélectionner des fichiers</span>
                  </Button>
                </label>
              </div>

              {/* File list */}
              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">
                    {t("csvImport.multi.filesSelected", { count: selectedFiles.length })}
                  </div>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {selectedFiles.map(file => (
                      <div 
                        key={file.id} 
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          file.status === 'error' 
                            ? 'border-destructive/50 bg-destructive/5' 
                            : 'border-border bg-muted/30'
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <FileText className={`h-5 w-5 shrink-0 ${
                            file.status === 'error' ? 'text-destructive' : 'text-lavcom-green'
                          }`} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{file.file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(file.file.size)}
                              {file.status === 'ready' && (
                                <span className="ml-2">
                                  • {file.importable_count} importables
                                  {file.to_review_count > 0 && `, ${file.to_review_count} à vérifier`}
                                </span>
                              )}
                              {file.error && (
                                <span className="text-destructive ml-2">• {file.error}</span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {file.status === 'parsing' && (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          )}
                          {file.status === 'ready' && (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          )}
                          {file.status === 'error' && (
                            <AlertCircle className="h-4 w-4 text-destructive" />
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(file.id)}
                            className="h-8 w-8 p-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isProcessing && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyse des fichiers...
                </div>
              )}

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
                  disabled={!canProceedToPreview || isProcessing}
                  className="bg-lavcom-green hover:bg-lavcom-green-dark text-white"
                >
                  Continuer
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </>
          )}

          {/* Step: Preview */}
          {currentStep === "preview" && (
            <>
              {/* Summary with CB/ESP/FI totals */}
              <MultiCsvSummaryCard files={selectedFiles} rows={allRows} />

              {/* Lines preview with tabs */}
              <MultiCsvLinesPreview
                rows={allRows}
                onRowSelectionChange={handleRowSelectionChange}
                onSelectAll={handleSelectAll}
              />

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
                      {t("csvImport.launchImport", { count: selectedRowsCount })}
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
