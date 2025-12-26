import { useState, useMemo } from "react";
import { AlertTriangle, Check, X, Edit2, Save, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ColumnMapping, ParsedRow } from "./types";
import { parseDate, parseAmount } from "./csvParser";

interface ErrorRowsEditorProps {
  rows: string[][];
  mapping: ColumnMapping;
  parsedRows: ParsedRow[];
  onRowsChange: (updatedRows: string[][]) => void;
}

interface EditingState {
  rowIndex: number;
  dateValue: string;
  amountValue: string;
}

export function ErrorRowsEditor({
  rows,
  mapping,
  parsedRows,
  onRowsChange,
}: ErrorRowsEditorProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [editing, setEditing] = useState<EditingState | null>(null);

  // Get indices of error rows
  const errorRowIndices = useMemo(() => {
    return parsedRows
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => !row.isValid)
      .map(({ index }) => index);
  }, [parsedRows]);

  const errorCount = errorRowIndices.length;

  if (errorCount === 0) {
    return null;
  }

  const handleEdit = (rowIndex: number) => {
    const dateColIndex = mapping.date;
    const amountColIndex = mapping.amount;
    
    setEditing({
      rowIndex,
      dateValue: dateColIndex !== null ? rows[rowIndex][dateColIndex] || "" : "",
      amountValue: amountColIndex !== null ? rows[rowIndex][amountColIndex] || "" : "",
    });
  };

  const handleSave = () => {
    if (!editing) return;

    const newRows = [...rows];
    const newRow = [...newRows[editing.rowIndex]];

    if (mapping.date !== null) {
      newRow[mapping.date] = editing.dateValue;
    }
    if (mapping.amount !== null) {
      newRow[mapping.amount] = editing.amountValue;
    }

    newRows[editing.rowIndex] = newRow;
    onRowsChange(newRows);
    setEditing(null);
  };

  const handleCancel = () => {
    setEditing(null);
  };

  const handleReset = (rowIndex: number) => {
    // Reset to original values (just trigger re-render)
    onRowsChange([...rows]);
  };

  const getValidationStatus = (dateValue: string, amountValue: string) => {
    const parsedDateValue = parseDate(dateValue);
    const parsedAmountValue = parseAmount(amountValue);
    
    return {
      dateValid: parsedDateValue !== null,
      amountValid: parsedAmountValue !== null && parsedAmountValue > 0,
      isNowValid: parsedDateValue !== null && parsedAmountValue !== null && parsedAmountValue > 0,
    };
  };

  const formatDatePreview = (value: string): string => {
    const parsed = parseDate(value);
    if (parsed) {
      return parsed.toLocaleDateString("fr-FR");
    }
    return "—";
  };

  const formatAmountPreview = (value: string): string => {
    const parsed = parseAmount(value);
    if (parsed !== null) {
      return new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: "EUR",
      }).format(parsed);
    }
    return "—";
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-100/50 dark:hover:bg-amber-900/30"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span className="font-medium text-amber-700 dark:text-amber-400">
              {errorCount} ligne{errorCount > 1 ? "s" : ""} en erreur
            </span>
            <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
              Cliquez pour corriger
            </Badge>
          </div>
          <span className="text-muted-foreground text-sm">
            {isOpen ? "Réduire" : "Développer"}
          </span>
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-3">
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 overflow-hidden">
          <div className="bg-amber-50/50 dark:bg-amber-950/30 px-4 py-2 border-b border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Corrigez les valeurs invalides ci-dessous. Les lignes corrigées seront incluses dans l'import.
            </p>
          </div>

          <ScrollArea className="max-h-[300px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-[60px]">Ligne</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Aperçu</TableHead>
                  <TableHead className="w-[120px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {errorRowIndices.slice(0, 50).map((rowIndex) => {
                  const isEditing = editing?.rowIndex === rowIndex;
                  const row = rows[rowIndex];
                  const parsedRow = parsedRows[rowIndex];
                  
                  const dateValue = isEditing
                    ? editing.dateValue
                    : mapping.date !== null
                    ? row[mapping.date] || ""
                    : "";
                  const amountValue = isEditing
                    ? editing.amountValue
                    : mapping.amount !== null
                    ? row[mapping.amount] || ""
                    : "";

                  const validation = getValidationStatus(dateValue, amountValue);

                  return (
                    <TableRow
                      key={rowIndex}
                      className={
                        validation.isNowValid
                          ? "bg-green-50/50 dark:bg-green-950/20"
                          : "bg-red-50/30 dark:bg-red-950/10"
                      }
                    >
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {rowIndex + 2}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={editing.dateValue}
                            onChange={(e) =>
                              setEditing({ ...editing, dateValue: e.target.value })
                            }
                            placeholder="DD/MM/YYYY"
                            className={`h-8 text-sm ${
                              !validation.dateValid ? "border-red-500" : "border-green-500"
                            }`}
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm ${
                                !validation.dateValid ? "text-red-600" : ""
                              }`}
                            >
                              {dateValue || "—"}
                            </span>
                            {!validation.dateValid && (
                              <X className="h-3 w-3 text-red-500" />
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={editing.amountValue}
                            onChange={(e) =>
                              setEditing({ ...editing, amountValue: e.target.value })
                            }
                            placeholder="12,50"
                            className={`h-8 text-sm ${
                              !validation.amountValid ? "border-red-500" : "border-green-500"
                            }`}
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm ${
                                !validation.amountValid ? "text-red-600" : ""
                              }`}
                            >
                              {amountValue || "—"}
                            </span>
                            {!validation.amountValid && (
                              <X className="h-3 w-3 text-red-500" />
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>
                            {formatDatePreview(dateValue)}
                          </span>
                          <span>→</span>
                          <span className="font-medium">
                            {formatAmountPreview(amountValue)}
                          </span>
                          {validation.isNowValid && (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs">
                              <Check className="h-3 w-3 mr-1" />
                              Corrigé
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleCancel}
                              className="h-7 w-7 p-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={handleSave}
                              className="h-7 px-2 bg-green-600 hover:bg-green-700 text-white"
                            >
                              <Save className="h-3 w-3 mr-1" />
                              OK
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(rowIndex)}
                            className="h-7 px-2"
                          >
                            <Edit2 className="h-3 w-3 mr-1" />
                            Modifier
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>

          {errorRowIndices.length > 50 && (
            <div className="px-4 py-2 bg-muted/30 border-t text-sm text-muted-foreground text-center">
              Affichage des 50 premières lignes sur {errorRowIndices.length} en erreur.
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
