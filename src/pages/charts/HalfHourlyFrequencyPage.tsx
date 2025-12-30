import { useDateRange } from "@/hooks/useDateRange";
import { useHalfHourlyFrequency } from "@/hooks/useChartsData";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function HalfHourlyFrequencyPage() {
  const { dateRange, setDateRange } = useDateRange();
  const { data: halfHourlyData, isLoading } = useHalfHourlyFrequency();

  const total = halfHourlyData?.reduce((sum, d) => sum + d.count, 0) ?? 0;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
            Fréquentation par 30 min
          </h1>
          <p className="text-muted-foreground">
            Nombre de cycles par tranche de 30 minutes
          </p>
        </div>
        <DateRangePicker 
          dateRange={dateRange} 
          onDateChange={setDateRange}
          showPresets
        />
      </div>

      {isLoading ? (
        <div className="kpi-card h-[400px]">
          <Skeleton className="h-full w-full" />
        </div>
      ) : !halfHourlyData || halfHourlyData.length === 0 ? (
        <div className="kpi-card h-[400px] flex items-center justify-center text-muted-foreground">
          Aucune donnée disponible pour la période sélectionnée
        </div>
      ) : (
        <>
          <div className="kpi-card h-[400px]">
            <h3 className="font-display font-semibold text-lg mb-4">Cycles par tranche de 30 min</h3>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={halfHourlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="time" 
                  tick={{ fontSize: 10 }}
                  stroke="hsl(var(--muted-foreground))"
                  interval={1}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [value, "Cycles"]}
                />
                <Bar 
                  dataKey="count" 
                  fill="hsl(var(--primary))"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="kpi-card">
            <h3 className="font-display font-semibold text-lg mb-4">Détail par tranche</h3>
            <div className="overflow-x-auto max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Heure</TableHead>
                    <TableHead className="text-right">Nombre de cycles</TableHead>
                    <TableHead className="text-right">% du total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {halfHourlyData.map((row) => (
                    <TableRow key={row.time}>
                      <TableCell className="font-medium">{row.time}</TableCell>
                      <TableCell className="text-right">{row.count}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {total > 0 ? ((row.count / total) * 100).toFixed(1) : 0}%
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-semibold">
                    <TableCell>TOTAL</TableCell>
                    <TableCell className="text-right text-primary">{total}</TableCell>
                    <TableCell className="text-right">100%</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
