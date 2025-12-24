import { CSVColumn, ColumnMapping, COLUMN_OPTIONS } from "./types";
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
import { CheckCircle2, AlertCircle, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState, useEffect } from "react";

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (el) {
      setCanScrollLeft(el.scrollLeft > 0);
      setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [columns]);

  const getMappedType = (columnIndex: number): keyof ColumnMapping | "ignore" => {
    for (const [key, value] of Object.entries(mapping)) {
      if (value === columnIndex) return key as keyof ColumnMapping;
    }
    return "ignore";
  };

  const handleMappingSelect = (columnIndex: number, value: string) => {
    const currentType = getMappedType(columnIndex);
    if (currentType !== "ignore") {
      onMappingChange(currentType, null);
    }
    if (value !== "ignore") {
      onMappingChange(value as keyof ColumnMapping, columnIndex);
    }
  };

  const getMappingStatus = () => {
    const hasDate = mapping.date !== null;
    const hasAmount = mapping.amount !== null;
    return { hasDate, hasAmount, isValid: hasDate && hasAmount };
  };

  const status = getMappingStatus();

  // Check if the data looks like it has valid date/amount values
  const hasValidLookingData = columns.length > 0 && previewRows.slice(0, 5).some(row => {
    return row.some(cell => {
      if (!cell) return false;
      const isDateLike = /^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/.test(cell.trim()) || 
                         /^\d{4}-\d{2}-\d{2}$/.test(cell.trim());
      const cleaned = cell.replace(/[€\s]/g, '').replace(',', '.');
      const isAmountLike = !isNaN(parseFloat(cleaned)) && parseFloat(cleaned) > 0;
      return isDateLike || isAmountLike;
    });
  });

  // Show empty state if no columns
  if (columns.length === 0) {
    return (
      <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="text-sm">
          <strong>Fichier vide</strong> — Aucune colonne détectée dans le fichier CSV.
        </AlertDescription>
      </Alert>
    );
  }

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
      <div className="flex items-center gap-4 text-sm flex-wrap">
        <div className={`flex items-center gap-1.5 ${status.hasDate ? "text-lavcom-green" : "text-destructive"}`}>
          {status.hasDate ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <span>Date</span>
        </div>
        <div className={`flex items-center gap-1.5 ${status.hasAmount ? "text-lavcom-green" : "text-destructive"}`}>
          {status.hasAmount ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <span>Montant</span>
        </div>
        {mapping.time !== null && (
          <div className="flex items-center gap-1.5 text-lavcom-green">
            <CheckCircle2 className="h-4 w-4" />
            <span>Heure</span>
          </div>
        )}
        {mapping.machine !== null && (
          <div className="flex items-center gap-1.5 text-lavcom-green">
            <CheckCircle2 className="h-4 w-4" />
            <span>Machine</span>
          </div>
        )}
      </div>

      {/* Preview table with scroll indicators */}
      <div className="relative border border-border rounded-lg overflow-hidden">
        {/* Scroll indicators */}
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent z-20 pointer-events-none flex items-center justify-start pl-1">
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-20 pointer-events-none flex items-center justify-end pr-1">
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        )}

        <div 
          ref={scrollRef}
          onScroll={checkScroll}
          className="overflow-x-auto max-h-[300px]"
        >
          <Table>
            <TableHeader className="sticky top-0 bg-muted z-10">
              <TableRow>
                {columns.map((col) => (
                  <TableHead key={col.index} className="min-w-[160px] p-2 border-r border-border last:border-r-0">
                    <div className="space-y-1.5">
                      <p className="font-medium text-xs text-foreground truncate" title={col.header}>
                        {col.header || `Colonne ${col.index + 1}`}
                      </p>
                      <Select
                        value={getMappedType(col.index)}
                        onValueChange={(value) => handleMappingSelect(col.index, value)}
                      >
                        <SelectTrigger className="h-7 text-xs bg-background">
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
              {previewRows.slice(0, 8).map((row, rowIndex) => (
                <TableRow key={rowIndex} className="hover:bg-muted/50">
                  {columns.map((col) => (
                    <TableCell key={col.index} className="p-2 text-xs border-r border-border/50 last:border-r-0">
                      <span className="block truncate max-w-[150px] tabular-nums" title={row[col.index]}>
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
          : `${previewRows.length} lignes détectées — Vous pouvez ajuster le mapping avant de valider.`}
      </p>
    </div>
  );
}
