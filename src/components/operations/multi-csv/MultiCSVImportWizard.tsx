import { useState, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileWithMeta, WIZARD_STEPS } from "./types";
import { MultiCSVUploadStep } from "./MultiCSVUploadStep";
import { MultiCSVAssociationStep } from "./MultiCSVAssociationStep";
import { MultiCSVReviewStep } from "./MultiCSVReviewStep";
import { MultiCSVImportStep } from "./MultiCSVImportStep";
import { parseMultiCsvFile } from "@/lib/csv/parseMultiCsv";
import { MultiCsvParsedRow, MAX_FILES_PER_IMPORT } from "@/lib/csv/multiCsvTypes";
import { parseCSVToColumns, autoDetectMapping, parseRows, calculateSummary } from "../csv-import/csvParser";
import { useOperationsImport } from "@/hooks/useOperationsImport";
import { useImportRateLimit } from "@/hooks/useImportRateLimit";
import { useSites } from "@/hooks/useSites";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface MultiCSVImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MultiCSVImportWizard({
  open,
  onOpenChange,
}: MultiCSVImportWizardProps) {
  const navigate = useNavigate();
  const { t } = useTranslation("app");
  const { user } = useAuth();
  const { sites, createSite, fetchSites } = useSites();
  const { importOperations } = useOperationsImport();
  const { validateFile, validateLines } = useImportRateLimit();

  const [currentStep, setCurrentStep] = useState<number>(0);
  const [files, setFiles] = useState<FileWithMeta[]>([]);
  const [allRows, setAllRows] = useState<MultiCsvParsedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCreatingSite, setIsCreatingSite] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);

  // Generate unique ID
  const generateId = () => Math.random().toString(36).substring(2, 15);

  // Check for duplicate
  const checkDuplicate = useCallback(
    async (
      filename: string,
      lineCount: number
    ): Promise<string | null> => {
      if (!user) return null;

      try {
        const { data: recentBatches } = await supabase
          .from("import_batches")
          .select("filename, imported_rows, created_at")
          .eq("user_id", user.id)
          .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .order("created_at", { ascending: false })
          .limit(50);

        if (recentBatches) {
          const similar = recentBatches.find(
            (batch) =>
              batch.filename === filename &&
              Math.abs(batch.imported_rows - lineCount) < 5
          );

          if (similar) {
            return `Ce fichier semble déjà avoir été importé le ${format(
              new Date(similar.created_at),
              "dd/MM/yyyy"
            )}`;
          }
        }
      } catch (error) {
        console.error("Error checking duplicate:", error);
      }

      return null;
    },
    [user]
  );

  // Process files with new multi-CSV parser
  const processFiles = useCallback(
    async (newFiles: File[]) => {
      // Check max files limit
      const totalFiles = files.length + newFiles.length;
      if (totalFiles > MAX_FILES_PER_IMPORT) {
        toast({
          title: "Limite atteinte",
          description: `Maximum ${MAX_FILES_PER_IMPORT} fichiers par import`,
          variant: "destructive",
        });
        return;
      }

      setIsProcessing(true);

      const fileItems: FileWithMeta[] = newFiles.map((file) => {
        const validation = validateFile(file);
        if (!validation.valid) {
          return {
            id: generateId(),
            file,
            status: "error" as const,
            siteId: null,
            summary: null,
            parsedRows: [],
            multiCsvRows: [],
            error: t(`csvImport.${validation.errorKey}`),
            duplicateWarning: null,
          };
        }
        return {
          id: generateId(),
          file,
          status: "parsing" as const,
          siteId: null,
          summary: null,
          parsedRows: [],
          multiCsvRows: [],
          error: null,
          duplicateWarning: null,
        };
      });

      setFiles((prev) => [...prev, ...fileItems]);

      // Process each file
      for (const fileItem of fileItems) {
        if (fileItem.status === "error") continue;
        
        try {
          const text = await fileItem.file.text();
          
          // Use new multi-CSV parser
          const multiCsvRows = parseMultiCsvFile(fileItem.file.name, text);
          
          if (multiCsvRows.length === 0) {
            setFiles((prev) =>
              prev.map((f) =>
                f.id === fileItem.id
                  ? { ...f, status: "error" as const, error: "Fichier vide ou format invalide" }
                  : f
              )
            );
            continue;
          }

          // Also parse with legacy parser for backward compatibility
          const { columns, rows } = parseCSVToColumns(text);
          const mapping = autoDetectMapping(columns);
          const parsedRows = parseRows(rows, mapping);
          const summary = calculateSummary(parsedRows);

          // Check for duplicates
          const duplicateWarning = await checkDuplicate(
            fileItem.file.name,
            multiCsvRows.filter(r => r.status === 'importable').length
          );

          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileItem.id
                ? {
                    ...f,
                    status: "ready" as const,
                    summary,
                    parsedRows,
                    multiCsvRows,
                    duplicateWarning,
                  }
                : f
            )
          );
        } catch (error) {
          console.error("Error processing file:", error);
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileItem.id
                ? { ...f, status: "error" as const, error: "Erreur lors de l'analyse" }
                : f
            )
          );
        }
      }

      setIsProcessing(false);
    },
    [files.length, checkDuplicate, validateFile, t]
  );

  // Aggregate all rows from all ready files
  useEffect(() => {
    const readyFiles = files.filter(f => f.status === "ready" && f.multiCsvRows);
    const aggregated: MultiCsvParsedRow[] = [];
    
    readyFiles.forEach(f => {
      if (f.multiCsvRows) {
        aggregated.push(...f.multiCsvRows);
      }
    });
    
    setAllRows(aggregated);
  }, [files]);

  // Handle row selection change
  const handleRowSelectionChange = useCallback((rowIndex: number, selected: boolean) => {
    setAllRows(prev => prev.map((row, idx) => 
      idx === rowIndex ? { ...row, selected } : row
    ));
  }, []);

  // Handle select all by status
  const handleSelectAllByStatus = useCallback((status: 'importable' | 'to_review', selected: boolean) => {
    setAllRows(prev => prev.map(row => 
      row.status === status ? { ...row, selected } : row
    ));
  }, []);

  // Remove file
  const removeFile = useCallback((fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  // Update file site
  const updateFileSite = useCallback(
    (fileId: string, siteId: string, siteName: string) => {
      setFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, siteId, siteName } : f))
      );
    },
    []
  );

  // Create site
  const handleCreateSite = useCallback(
    async (name: string): Promise<{ id: string; name: string } | null> => {
      setIsCreatingSite(true);
      try {
        const newSite = await createSite({ name });
        await fetchSites();
        return { id: newSite.id, name: newSite.name };
      } catch (error) {
        console.error("Error creating site:", error);
        toast({
          title: "Erreur",
          description: "Impossible de créer la laverie",
          variant: "destructive",
        });
        return null;
      } finally {
        setIsCreatingSite(false);
      }
    },
    [createSite, fetchSites]
  );

  // Import all files with selected rows
  const importAllFiles = useCallback(async () => {
    const readyFiles = files.filter((f) => f.status === "ready" && f.siteId);
    if (readyFiles.length === 0) return;

    const selectedRows = allRows.filter(r => r.selected);
    if (selectedRows.length === 0) {
      toast({
        title: "Aucune ligne sélectionnée",
        description: "Sélectionnez au moins une ligne à importer",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    setImportProgress(0);
    setCurrentFileIndex(0);

    for (let i = 0; i < readyFiles.length; i++) {
      const fileItem = readyFiles[i];
      setCurrentFileIndex(i);
      setImportProgress(((i + 0.5) / readyFiles.length) * 100);

      // Get selected rows for this file
      const fileSelectedRows = selectedRows.filter(r => r.source_file_name === fileItem.file.name);
      
      if (fileSelectedRows.length === 0) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileItem.id
              ? {
                  ...f,
                  status: "success" as const,
                  importResult: { imported: 0, ignored: 0, errors: [] },
                }
              : f
          )
        );
        continue;
      }

      // Update status to importing
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileItem.id ? { ...f, status: "importing" as const } : f
        )
      );

      try {
        // Convert MultiCsvParsedRow to ParsedRow format for import
        const parsedRowsForImport = fileSelectedRows.map(row => ({
          date: row.date_iso ? new Date(row.date_iso) : null,
          time: row.time || null,
          amount: row.amount_cents ? row.amount_cents / 100 : 0,
          paymentMode: row.normalized_mode || null,
          machine: row.machine || null,
          program: row.program || null,
          rawData: row.raw_data,
          isValid: row.status === 'importable',
          errors: row.errors,
          inserted_eur: row.inserted_cents ? row.inserted_cents / 100 : null,
          price_eur: row.price_cents ? row.price_cents / 100 : null,
          change_eur: row.change_cents ? row.change_cents / 100 : null,
        }));

        const result = await importOperations(
          fileItem.siteId!,
          fileItem.file.name,
          parsedRowsForImport
        );

        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileItem.id
              ? {
                  ...f,
                  status: result.success ? ("success" as const) : ("error" as const),
                  importResult: {
                    imported: result.imported,
                    ignored: result.ignored,
                    errors: result.errors || [],
                  },
                  error: result.success ? null : result.errors?.[0] || "Erreur inconnue",
                }
              : f
          )
        );
      } catch (error) {
        console.error("Import error:", error);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileItem.id
              ? {
                  ...f,
                  status: "error" as const,
                  error: "Erreur lors de l'import",
                }
              : f
          )
        );
      }

      setImportProgress(((i + 1) / readyFiles.length) * 100);
    }

    setIsImporting(false);
  }, [files, allRows, importOperations]);

  // Retry file
  const retryFile = useCallback(
    async (fileId: string) => {
      const fileItem = files.find((f) => f.id === fileId);
      if (!fileItem || !fileItem.siteId) return;

      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { ...f, status: "importing" as const, error: null } : f
        )
      );

      try {
        const result = await importOperations(
          fileItem.siteId,
          fileItem.file.name,
          fileItem.parsedRows
        );

        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileId
              ? {
                  ...f,
                  status: result.success ? ("success" as const) : ("error" as const),
                  importResult: {
                    imported: result.imported,
                    ignored: result.ignored,
                    errors: result.errors || [],
                  },
                  error: result.success ? null : result.errors?.[0] || "Erreur",
                }
              : f
          )
        );
      } catch (error) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileId
              ? { ...f, status: "error" as const, error: "Erreur lors de l'import" }
              : f
          )
        );
      }
    },
    [files, importOperations]
  );

  // Navigation
  const canGoNext = useCallback(() => {
    if (currentStep === 0) {
      return files.filter((f) => f.status === "ready").length > 0;
    }
    if (currentStep === 1) {
      return files.filter((f) => f.status === "ready").every((f) => f.siteId);
    }
    if (currentStep === 2) {
      return allRows.filter(r => r.selected).length > 0;
    }
    return false;
  }, [currentStep, files, allRows]);

  const handleNext = useCallback(() => {
    if (currentStep === 2) {
      // Start import
      importAllFiles();
    }
    setCurrentStep((prev) => Math.min(prev + 1, WIZARD_STEPS.length - 1));
  }, [currentStep, importAllFiles]);

  const handleBack = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  // Final actions
  const handleGoToDashboard = useCallback(() => {
    const successFiles = files.filter((f) => f.status === "success");
    if (successFiles.length === 1 && successFiles[0].siteId) {
      localStorage.setItem("selectedSiteId", successFiles[0].siteId);
      navigate(`/dashboard`);
    } else {
      navigate("/dashboard");
    }
    onOpenChange(false);
  }, [files, navigate, onOpenChange]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setCurrentStep(0);
      setFiles([]);
      setAllRows([]);
      setIsProcessing(false);
      setIsImporting(false);
      setImportProgress(0);
      setCurrentFileIndex(0);
    }
  }, [open]);

  const isComplete =
    currentStep === 3 &&
    !isImporting &&
    files.every((f) => f.status === "success" || f.status === "error");

  const successCount = files.filter((f) => f.status === "success").length;
  const selectedRowsCount = allRows.filter(r => r.selected).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Import multi-fichiers
            </DialogTitle>
          </div>
          {/* Steps indicator */}
          <div className="flex items-center gap-2 mt-4">
            {WIZARD_STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <div
                  className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all",
                    index < currentStep
                      ? "bg-primary text-primary-foreground"
                      : index === currentStep
                        ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  {index + 1}
                </div>
                {index < WIZARD_STEPS.length - 1 && (
                  <div
                    className={cn(
                      "flex-1 h-1 mx-2 rounded transition-all",
                      index < currentStep ? "bg-primary" : "bg-muted"
                    )}
                  />
                )}
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {WIZARD_STEPS[currentStep].description}
          </p>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {currentStep === 0 && (
            <MultiCSVUploadStep
              files={files}
              onFilesAdd={processFiles}
              onFileRemove={removeFile}
              isProcessing={isProcessing}
            />
          )}
          {currentStep === 1 && (
            <MultiCSVAssociationStep
              files={files.filter((f) => f.status === "ready")}
              sites={sites}
              onFileUpdate={updateFileSite}
              onCreateSite={handleCreateSite}
              isCreatingSite={isCreatingSite}
            />
          )}
          {currentStep === 2 && (
            <MultiCSVReviewStep
              files={files.filter((f) => f.status === "ready")}
              allRows={allRows}
              onRowSelectionChange={handleRowSelectionChange}
              onSelectAllByStatus={handleSelectAllByStatus}
            />
          )}
          {currentStep === 3 && (
            <MultiCSVImportStep
              files={files.filter((f) => f.status !== "pending" && f.status !== "parsing")}
              isImporting={isImporting}
              importProgress={importProgress}
              currentFileIndex={currentFileIndex}
              onRetryFile={retryFile}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border shrink-0 flex items-center justify-between gap-4">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0 || isImporting}
            className={cn(currentStep === 0 && "invisible")}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Retour
          </Button>

          <div className="flex items-center gap-2">
            {isComplete ? (
              <>
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Fermer
                </Button>
                <Button onClick={handleGoToDashboard}>
                  {successCount === 1
                    ? "Aller au tableau de bord"
                    : "Voir comparatifs"}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </>
            ) : currentStep < 3 ? (
              <Button
                onClick={handleNext}
                disabled={!canGoNext() || isProcessing}
              >
                {currentStep === 2 
                  ? `Lancer l'import (${selectedRowsCount} lignes)` 
                  : "Continuer"}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
