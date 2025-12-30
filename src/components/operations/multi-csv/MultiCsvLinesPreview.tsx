/**
 * Multi-CSV Lines Preview with tabs for Importable/ToReview/Invalid
 */

import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle, AlertTriangle, XCircle, Check } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MultiCsvParsedRow } from "@/lib/csv/multiCsvTypes";
import { centsToEuros } from "@/lib/csv/parseAmount";

interface MultiCsvLinesPreviewProps {
  rows: MultiCsvParsedRow[];
  onRowSelectionChange: (rowIndex: number, selected: boolean) => void;
  onSelectAll: (status: 'importable' | 'to_review', selected: boolean) => void;
}

export function MultiCsvLinesPreview({
  rows,
  onRowSelectionChange,
  onSelectAll,
}: MultiCsvLinesPreviewProps) {
  const { t } = useTranslation("app");
  const [activeTab, setActiveTab] = useState<string>("importable");

  const importableRows = useMemo(() => rows.filter(r => r.status === 'importable'), [rows]);
  const toReviewRows = useMemo(() => rows.filter(r => r.status === 'to_review'), [rows]);
  const invalidRows = useMemo(() => rows.filter(r => r.status === 'invalid'), [rows]);

  const allImportableSelected = importableRows.every(r => r.selected);
  const allToReviewSelected = toReviewRows.length > 0 && toReviewRows.every(r => r.selected);

  const formatAmount = (cents: number | null) => {
    if (cents === null) return <span className="text-muted-foreground">—</span>;
    const euros = centsToEuros(cents);
    return euros !== null ? `${euros.toFixed(2)} €` : '—';
  };

  const getModeBadge = (mode: string | null) => {
    if (!mode) return <span className="text-muted-foreground">—</span>;
    switch (mode) {
      case 'CB':
        return <Badge className="bg-blue-500/10 text-blue-700 border-blue-500/20">CB</Badge>;
      case 'ESP':
        return <Badge className="bg-green-500/10 text-green-700 border-green-500/20">ESP</Badge>;
      case 'FI':
        return <Badge className="bg-purple-500/10 text-purple-700 border-purple-500/20">FI</Badge>;
      default:
        return <Badge variant="secondary">{mode}</Badge>;
    }
  };

  const renderTable = (filteredRows: MultiCsvParsedRow[], showCheckbox: boolean, canSelect: boolean) => {
    if (filteredRows.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          Aucune ligne dans cette catégorie
        </div>
      );
    }

    return (
      <ScrollArea className="h-[400px]">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {showCheckbox && canSelect && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={filteredRows.length > 0 && filteredRows.every(r => r.selected)}
                    onCheckedChange={(checked) => {
                      const status = filteredRows[0]?.status as 'importable' | 'to_review';
                      onSelectAll(status, !!checked);
                    }}
                  />
                </TableHead>
              )}
              <TableHead className="w-[120px]">{t("csvImport.lines.file")}</TableHead>
              <TableHead className="w-[60px]">{t("csvImport.lines.row")}</TableHead>
              <TableHead className="w-[100px]">Date</TableHead>
              <TableHead className="w-[60px]">Heure</TableHead>
              <TableHead className="w-[80px]">Mode</TableHead>
              <TableHead className="w-[100px] text-right">Montant</TableHead>
              <TableHead>Machine</TableHead>
              {filteredRows[0]?.status !== 'importable' && (
                <TableHead>{t("csvImport.lines.reason")}</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRows.slice(0, 100).map((row, idx) => {
              const globalIndex = rows.indexOf(row);
              return (
                <TableRow key={`${row.source_file_name}-${row.row_index_in_file}`} className="hover:bg-muted/30">
                  {showCheckbox && canSelect && (
                    <TableCell>
                      <Checkbox
                        checked={row.selected}
                        onCheckedChange={(checked) => onRowSelectionChange(globalIndex, !!checked)}
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-mono text-xs truncate max-w-[120px]" title={row.source_file_name}>
                    {row.source_file_name.length > 15 
                      ? `...${row.source_file_name.slice(-12)}` 
                      : row.source_file_name}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {row.row_index_in_file + 1}
                  </TableCell>
                  <TableCell className="font-medium whitespace-nowrap">
                    {row.date_iso || <span className="text-destructive">—</span>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.time || '—'}
                  </TableCell>
                  <TableCell>{getModeBadge(row.normalized_mode)}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatAmount(row.amount_cents)}
                  </TableCell>
                  <TableCell className="truncate max-w-[150px]" title={row.machine || ''}>
                    {row.machine || '—'}
                  </TableCell>
                  {row.status !== 'importable' && (
                    <TableCell className="text-xs text-muted-foreground">
                      {row.errors.join(', ')}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {filteredRows.length > 100 && (
          <div className="p-3 text-center text-sm text-muted-foreground bg-muted/50 border-t">
            Affichage des 100 premières lignes sur {filteredRows.length}
          </div>
        )}
      </ScrollArea>
    );
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="importable" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>{t("csvImport.tabs.importable")}</span>
            <Badge variant="secondary" className="ml-1">
              {importableRows.filter(r => r.selected).length}/{importableRows.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="to_review" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span>{t("csvImport.tabs.toReview")}</span>
            <Badge variant="secondary" className="ml-1">{toReviewRows.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="invalid" className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-destructive" />
            <span>{t("csvImport.tabs.invalid")}</span>
            <Badge variant="secondary" className="ml-1">{invalidRows.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="importable" className="mt-4">
          <div className="text-sm text-muted-foreground mb-2">
            Lignes prêtes à être importées (date + mode + montant valides)
          </div>
          {renderTable(importableRows, true, true)}
        </TabsContent>

        <TabsContent value="to_review" className="mt-4">
          <div className="text-sm text-muted-foreground mb-2">
            Lignes avec date et mode valides mais montant manquant
          </div>
          {renderTable(toReviewRows, true, true)}
        </TabsContent>

        <TabsContent value="invalid" className="mt-4">
          <div className="text-sm text-muted-foreground mb-2">
            Lignes qui ne peuvent pas être importées
          </div>
          {renderTable(invalidRows, false, false)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
