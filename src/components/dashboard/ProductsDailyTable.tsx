import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ProductsDailyData {
  day: number;
  laveLinge3: number | null;
  laveLinge4: number | null;
  laveLinge5: number | null;
  laveLinge6: number | null;
  lessive: number | null;
  secheLinge1: number | null;
  secheLinge2: number | null;
  rechCB: number | null;
  total: number;
}

interface ProductsDailyTableProps {
  data: ProductsDailyData[];
  totals: {
    laveLinge3: number;
    laveLinge4: number;
    laveLinge5: number;
    laveLinge6: number;
    lessive: number;
    secheLinge1: number;
    secheLinge2: number;
    rechCB: number;
    total: number;
  };
}

const formatCurrency = (value: number | null) => {
  if (value === null || value === 0) return "";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(value);
};

const getHeatmapColor = (value: number | null, maxValue: number) => {
  if (value === null || value === 0 || maxValue === 0) return "";
  const intensity = value / maxValue;
  // Green heatmap from light to dark green
  const lightness = 90 - intensity * 45; // From 90% (light) to 45% (dark)
  return `hsl(142, 70%, ${lightness}%)`;
};

export function ProductsDailyTable({ data, totals }: ProductsDailyTableProps) {
  // Calculate max values for each column for heatmap scaling
  const maxValues = {
    laveLinge3: Math.max(...data.map((d) => d.laveLinge3 || 0)),
    laveLinge4: Math.max(...data.map((d) => d.laveLinge4 || 0)),
    laveLinge5: Math.max(...data.map((d) => d.laveLinge5 || 0)),
    laveLinge6: Math.max(...data.map((d) => d.laveLinge6 || 0)),
    lessive: Math.max(...data.map((d) => d.lessive || 0)),
    secheLinge1: Math.max(...data.map((d) => d.secheLinge1 || 0)),
    secheLinge2: Math.max(...data.map((d) => d.secheLinge2 || 0)),
    rechCB: Math.max(...data.map((d) => d.rechCB || 0)),
    total: Math.max(...data.map((d) => d.total)),
  };

  return (
    <div className="kpi-card overflow-x-auto">
      <h3 className="font-display font-semibold text-lg mb-4">CA par Produit / Jour</h3>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-semibold text-center w-16">Jour</TableHead>
            <TableHead className="font-semibold text-right">Lave linge 3</TableHead>
            <TableHead className="font-semibold text-right">Lave linge 4</TableHead>
            <TableHead className="font-semibold text-right">Lave linge 5</TableHead>
            <TableHead className="font-semibold text-right">Lave linge 6</TableHead>
            <TableHead className="font-semibold text-right">Lessive</TableHead>
            <TableHead className="font-semibold text-right">Sèche linge 1</TableHead>
            <TableHead className="font-semibold text-right">Sèche linge 2</TableHead>
            <TableHead className="font-semibold text-right">Rech CB</TableHead>
            <TableHead className="font-semibold text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow key={row.day}>
              <TableCell className="font-medium text-center">{row.day}</TableCell>
              <TableCell
                className="text-right"
                style={{ backgroundColor: getHeatmapColor(row.laveLinge3, maxValues.laveLinge3) }}
              >
                {formatCurrency(row.laveLinge3)}
              </TableCell>
              <TableCell
                className="text-right"
                style={{ backgroundColor: getHeatmapColor(row.laveLinge4, maxValues.laveLinge4) }}
              >
                {formatCurrency(row.laveLinge4)}
              </TableCell>
              <TableCell
                className="text-right"
                style={{ backgroundColor: getHeatmapColor(row.laveLinge5, maxValues.laveLinge5) }}
              >
                {formatCurrency(row.laveLinge5)}
              </TableCell>
              <TableCell
                className="text-right"
                style={{ backgroundColor: getHeatmapColor(row.laveLinge6, maxValues.laveLinge6) }}
              >
                {formatCurrency(row.laveLinge6)}
              </TableCell>
              <TableCell
                className="text-right"
                style={{ backgroundColor: getHeatmapColor(row.lessive, maxValues.lessive) }}
              >
                {formatCurrency(row.lessive)}
              </TableCell>
              <TableCell
                className="text-right"
                style={{ backgroundColor: getHeatmapColor(row.secheLinge1, maxValues.secheLinge1) }}
              >
                {formatCurrency(row.secheLinge1)}
              </TableCell>
              <TableCell
                className="text-right"
                style={{ backgroundColor: getHeatmapColor(row.secheLinge2, maxValues.secheLinge2) }}
              >
                {formatCurrency(row.secheLinge2)}
              </TableCell>
              <TableCell
                className="text-right"
                style={{ backgroundColor: getHeatmapColor(row.rechCB, maxValues.rechCB) }}
              >
                {formatCurrency(row.rechCB)}
              </TableCell>
              <TableCell
                className="text-right font-semibold"
                style={{ backgroundColor: getHeatmapColor(row.total, maxValues.total) }}
              >
                {formatCurrency(row.total)}
              </TableCell>
            </TableRow>
          ))}
          {/* Totals Row */}
          <TableRow className="bg-muted/80 font-bold border-t-2">
            <TableCell className="text-center">Total</TableCell>
            <TableCell className="text-right">{formatCurrency(totals.laveLinge3)}</TableCell>
            <TableCell className="text-right">{formatCurrency(totals.laveLinge4)}</TableCell>
            <TableCell className="text-right">{formatCurrency(totals.laveLinge5)}</TableCell>
            <TableCell className="text-right">{formatCurrency(totals.laveLinge6)}</TableCell>
            <TableCell className="text-right">{formatCurrency(totals.lessive)}</TableCell>
            <TableCell className="text-right">{formatCurrency(totals.secheLinge1)}</TableCell>
            <TableCell className="text-right">{formatCurrency(totals.secheLinge2)}</TableCell>
            <TableCell className="text-right">{formatCurrency(totals.rechCB)}</TableCell>
            <TableCell className="text-right">{formatCurrency(totals.total)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
