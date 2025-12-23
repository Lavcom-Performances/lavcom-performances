import { CSVColumn, ColumnMapping, ColumnType, COLUMN_OPTIONS } from "./types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, AlertTriangle } from "lucide-react";

interface CSVPreviewTableProps {
  columns: CSVColumn[];
  mapping: ColumnMapping;
  onMappingChange: (columnType: keyof ColumnMapping, columnIndex: number | null) => void;
  previewRows: string[][];
}

export function CSVPreviewTable({
  columns,
  mapping,
  onMappingChange,
  previewRows,
}: CSVPreviewTableProps) {
  const getMappedType = (columnIndex: number): keyof ColumnMapping | "ignore" => {
    for (const [key, value] of Object.entries(mapping)) {
      if (value === columnIndex) return key as keyof ColumnMapping;
    }
    return "ignore";
  };

  const handleMappingSelect = (columnIndex: number, value: string) => {
    // First, clear any existing mapping for this type
    const currentType = getMappedType(columnIndex);
    if (currentType !== "ignore") {
      onMappingChange(currentType, null);
    }

    // Then set the new mapping if not ignore
    if (value !== "ignore") {
      // Clear the column that was previously mapped to this type
      const prevIndex = mapping[value as keyof ColumnMapping];
      if (prevIndex !== null) {
        // The onMappingChange will handle this
      }
      onMappingChange(value as keyof ColumnMapping, columnIndex);
    }
  };

  const isColumnRequired = (type: string): boolean => {
    const option = COLUMN_OPTIONS.find((o) => o.value === type);
    return option?.required ?? false;
  };

  const getMappingStatus = () => {
    const hasDate = mapping.date !== null;
    const hasAmount = mapping.amount !== null;
    return { hasDate, hasAmount, isValid: hasDate && hasAmount };
  };

  const status = getMappingStatus();

  // Check if the data looks like it has valid date/amount values
  const hasValidLookingData = previewRows.slice(0, 5).some(row => {
    return row.some(cell => {
      // Check for date-like patterns
      const isDateLike = /^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/.test(cell) || 
                         /^\d{4}-\d{2}-\d{2}$/.test(cell);
      // Check for amount-like patterns
      const isAmountLike = /^\d+([.,]\d{1,2})?(\s*€)?$/.test(cell.replace(/\s/g, ''));
      return isDateLike || isAmountLike;
    });
  });

  return (
    <div className="space-y-3">
      {/* Warning if no valid data detected */}
      {!hasValidLookingData && previewRows.length > 0 && (
        <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>Format non reconnu</strong> — Les données ne semblent pas contenir de dates ou montants valides. 
            Vérifiez que votre fichier CSV contient bien des colonnes avec des dates (ex: 18/03/2025) et des montants (ex: 5,50 ou 5.50€).
          </AlertDescription>
        </Alert>
      )}

      {/* Mapping status */}
      <div className="flex items-center gap-4 text-sm">
        <div className={`flex items-center gap-1.5 ${status.hasDate ? "text-lavcom-green" : "text-destructive"}`}>
          {status.hasDate ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <span>Date</span>
        </div>
        <div className={`flex items-center gap-1.5 ${status.hasAmount ? "text-lavcom-green" : "text-destructive"}`}>
          {status.hasAmount ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <span>Montant</span>
        </div>
        {mapping.machine !== null && (
          <div className="flex items-center gap-1.5 text-lavcom-green">
            <CheckCircle2 className="h-4 w-4" />
            <span>Machine</span>
          </div>
        )}
      </div>

      {/* Preview table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto max-h-[300px]">
          <Table>
            <TableHeader className="sticky top-0 bg-muted z-10">
              <TableRow>
                {columns.map((col) => (
                  <TableHead key={col.index} className="min-w-[150px] p-2">
                    <div className="space-y-1.5">
                      <p className="font-medium text-xs text-foreground truncate" title={col.header}>
                        {col.header || `Colonne ${col.index + 1}`}
                      </p>
                      <Select
                        value={getMappedType(col.index)}
                        onValueChange={(value) => handleMappingSelect(col.index, value)}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COLUMN_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value} className="text-xs">
                              <span className="flex items-center gap-1.5">
                                {option.label}
                                {option.required && (
                                  <Badge variant="outline" className="text-[10px] py-0 px-1">
                                    requis
                                  </Badge>
                                )}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {previewRows.slice(0, 10).map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {columns.map((col) => (
                    <TableCell key={col.index} className="p-2 text-xs">
                      <span className="block truncate max-w-[150px]" title={row[col.index]}>
                        {row[col.index] || "-"}
                      </span>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Helper text */}
      <p className="text-xs text-muted-foreground">
        {!status.isValid 
          ? "Sélectionnez les colonnes Date et Montant pour pouvoir importer les données."
          : "Aucun souci : vous pouvez ajuster le mapping avant de valider."}
      </p>
    </div>
  );
}
