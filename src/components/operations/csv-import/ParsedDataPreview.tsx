import { ColumnMapping } from "./types";
import { parseDate, parseAmount } from "./csvParser";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Eye } from "lucide-react";

interface ParsedDataPreviewProps {
  mapping: ColumnMapping;
  rows: string[][];
}

interface ParsedPreviewRow {
  rawDate: string;
  parsedDate: string | null;
  rawTime: string | null;
  rawAmount: string;
  parsedAmount: string | null;
  machine: string | null;
  isValid: boolean;
}

export function ParsedDataPreview({ mapping, rows }: ParsedDataPreviewProps) {
  const hasRequiredMapping = mapping.date !== null && mapping.amount !== null;

  if (!hasRequiredMapping) {
    return null;
  }

  // Parse first 5 rows for preview
  const previewData: ParsedPreviewRow[] = rows.slice(0, 5).map((row) => {
    const rawDate = mapping.date !== null ? row[mapping.date] || "" : "";
    const rawAmount = mapping.amount !== null ? row[mapping.amount] || "" : "";
    const rawTime = mapping.time !== null ? row[mapping.time] || null : null;
    const machine = mapping.machine !== null ? row[mapping.machine] || null : null;

    const parsedDate = parseDate(rawDate);
    const parsedAmount = parseAmount(rawAmount);

    const formattedDate = parsedDate
      ? format(parsedDate, "EEEE d MMMM yyyy", { locale: fr })
      : null;

    const formattedAmount = parsedAmount !== null
      ? new Intl.NumberFormat("fr-FR", {
          style: "currency",
          currency: "EUR",
        }).format(parsedAmount)
      : null;

    return {
      rawDate,
      parsedDate: formattedDate,
      rawTime,
      rawAmount,
      parsedAmount: formattedAmount,
      machine,
      isValid: formattedDate !== null && formattedAmount !== null,
    };
  });

  const validCount = previewData.filter((r) => r.isValid).length;
  const invalidCount = previewData.length - validCount;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-medium">Aperçu des données interprétées</h4>
        <div className="flex gap-2 ml-auto">
          {validCount > 0 && (
            <Badge variant="outline" className="bg-lavcom-green/10 text-lavcom-green border-lavcom-green/30">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {validCount} valide{validCount > 1 ? "s" : ""}
            </Badge>
          )}
          {invalidCount > 0 && (
            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
              <XCircle className="h-3 w-3 mr-1" />
              {invalidCount} erreur{invalidCount > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      </div>

      <div className="border border-border rounded-lg overflow-hidden bg-muted/30">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead className="text-xs py-2">Date brute</TableHead>
              <TableHead className="text-xs py-2">→ Date interprétée</TableHead>
              {mapping.time !== null && (
                <TableHead className="text-xs py-2">Heure</TableHead>
              )}
              <TableHead className="text-xs py-2">Montant brut</TableHead>
              <TableHead className="text-xs py-2">→ Montant converti</TableHead>
              {mapping.machine !== null && (
                <TableHead className="text-xs py-2">Machine</TableHead>
              )}
              <TableHead className="text-xs py-2 w-16">Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {previewData.map((row, idx) => (
              <TableRow
                key={idx}
                className={row.isValid ? "" : "bg-destructive/5"}
              >
                <TableCell className="text-xs py-2 font-mono text-muted-foreground">
                  {row.rawDate || "-"}
                </TableCell>
                <TableCell className="text-xs py-2">
                  {row.parsedDate ? (
                    <span className="text-foreground capitalize">{row.parsedDate}</span>
                  ) : (
                    <span className="text-destructive italic">Non reconnu</span>
                  )}
                </TableCell>
                {mapping.time !== null && (
                  <TableCell className="text-xs py-2 tabular-nums">
                    {row.rawTime || "-"}
                  </TableCell>
                )}
                <TableCell className="text-xs py-2 font-mono text-muted-foreground">
                  {row.rawAmount || "-"}
                </TableCell>
                <TableCell className="text-xs py-2">
                  {row.parsedAmount ? (
                    <span className="text-lavcom-green font-medium tabular-nums">
                      {row.parsedAmount}
                    </span>
                  ) : (
                    <span className="text-destructive italic">Non reconnu</span>
                  )}
                </TableCell>
                {mapping.machine !== null && (
                  <TableCell className="text-xs py-2">
                    {row.machine || "-"}
                  </TableCell>
                )}
                <TableCell className="text-xs py-2">
                  {row.isValid ? (
                    <CheckCircle2 className="h-4 w-4 text-lavcom-green" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        Aperçu des 5 premières lignes après interprétation. Les dates sont converties au format lisible et les montants en euros.
      </p>
    </div>
  );
}
