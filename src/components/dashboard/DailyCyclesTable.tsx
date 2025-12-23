import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { HorizontalScrollTable } from "@/components/ui/horizontal-scroll-table";

interface DailyCyclesData {
  day: number;
  janvier?: number;
  fevrier?: number;
  mars?: number;
  avril?: number;
  mai?: number;
  juin?: number;
  juillet?: number;
  aout?: number;
  septembre?: number;
  octobre?: number;
  novembre?: number;
  decembre?: number;
  total: number;
}

interface DailyCyclesTableProps {
  data: DailyCyclesData[];
  monthTotals: {
    janvier: number;
    fevrier: number;
    mars: number;
    avril: number;
    mai: number;
    juin: number;
    juillet: number;
    aout: number;
    septembre: number;
    octobre: number;
    novembre: number;
    decembre: number;
    total: number;
  };
}

const monthHeaders = [
  { key: "janvier", label: "JAN" },
  { key: "fevrier", label: "FÉV" },
  { key: "mars", label: "MAR" },
  { key: "avril", label: "AVR" },
  { key: "mai", label: "MAI" },
  { key: "juin", label: "JUN" },
  { key: "juillet", label: "JUL" },
  { key: "aout", label: "AOÛ" },
  { key: "septembre", label: "SEP" },
  { key: "octobre", label: "OCT" },
  { key: "novembre", label: "NOV" },
  { key: "decembre", label: "DÉC" },
];

// Function to get green heatmap color based on value intensity
// Gradient: light yellow-green (#F4F8E8) -> medium green (#9DC284) -> dark green (#4E8B31)
function getHeatmapColor(value: number | undefined, maxValue: number): string {
  if (value === undefined || value === 0) return "transparent";
  const intensity = Math.min(value / maxValue, 1);
  
  // Interpolate from light yellow-green to dark green
  // Low: hsl(75, 50%, 94%) - light yellow-green
  // Mid: hsl(90, 40%, 64%) - medium green  
  // High: hsl(100, 48%, 37%) - dark green
  const hue = 75 + (intensity * 25); // 75 to 100
  const saturation = 50 - (intensity * 10) + (intensity * 8); // varies
  const lightness = 94 - (intensity * 57); // 94% to 37%
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

export function DailyCyclesTable({ data, monthTotals }: DailyCyclesTableProps) {
  // Calculate max value for heatmap scaling
  const allValues = data.flatMap(row => 
    monthHeaders.map(m => row[m.key as keyof DailyCyclesData] as number | undefined)
  ).filter((v): v is number => v !== undefined);
  const maxValue = Math.max(...allValues, 1);

  return (
    <div className="kpi-card">
      <h3 className="font-display font-semibold text-lg mb-4">Nombre de cycles par jour</h3>
      <HorizontalScrollTable>
        <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px] text-center font-semibold">JOUR</TableHead>
              {monthHeaders.map((month) => (
                <TableHead key={month.key} className="text-center text-xs">
                  {month.label}
                </TableHead>
              ))}
              <TableHead className="text-center font-semibold">TOTAL</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.day}>
                <TableCell className="text-center font-medium">{row.day}</TableCell>
                {monthHeaders.map((month) => {
                  const value = row[month.key as keyof DailyCyclesData] as number | undefined;
                  const bgColor = getHeatmapColor(value, maxValue);
                  return (
                    <TableCell 
                      key={month.key} 
                      className="text-center text-sm"
                      style={{ 
                        backgroundColor: bgColor,
                        color: value && value > maxValue * 0.6 ? 'white' : 'inherit'
                      }}
                    >
                      {value ?? "-"}
                    </TableCell>
                  );
                })}
                <TableCell className="text-center font-semibold text-primary">{row.total}</TableCell>
              </TableRow>
            ))}
            {/* Totals row */}
            <TableRow className="bg-muted/50 font-semibold">
              <TableCell className="text-center">TOTAL</TableCell>
              {monthHeaders.map((month) => (
                <TableCell key={month.key} className="text-center">
                  {monthTotals[month.key as keyof typeof monthTotals]}
                </TableCell>
              ))}
              <TableCell className="text-center text-primary">{monthTotals.total}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </HorizontalScrollTable>
    </div>
  );
}
