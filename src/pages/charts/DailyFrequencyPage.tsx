import { useDateRange } from "@/hooks/useDateRange";
import { useDailyFrequency } from "@/hooks/useChartsData";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { Skeleton } from "@/components/ui/skeleton";
import { useHasData } from "@/hooks/useHasData";
import { ChartEmptyState, DataLoadErrorState } from "@/components/ui/empty-state";
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

export default function DailyFrequencyPage() {
  const { dateRange, setDateRange } = useDateRange();
  const { data: dailyData, isLoading, error, refetch } = useDailyFrequency();
  const { hasData: hasImportedData, isLoading: dataLoading } = useHasData();

  const total = dailyData?.reduce((sum, d) => sum + d.count, 0) ?? 0;

  // Loading state
  if (dataLoading) {
    return (
      <div className="p-6 lg:p-8">
        <Skeleton className="h-10 w-64 mb-4" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  // No data imported - show premium empty state
  if (!hasImportedData) {
    return (
      <div className="p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
            Fréquentation par Jour
          </h1>
          <p className="text-muted-foreground">
            Nombre de cycles par jour de la semaine
          </p>
        </div>
        <div className="card-lavcom">
          <ChartEmptyState />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
            Fréquentation par Jour
          </h1>
        </div>
        <div className="card-lavcom">
          <DataLoadErrorState onRetry={() => refetch()} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
            Fréquentation par Jour
          </h1>
          <p className="text-muted-foreground">
            Nombre de cycles par jour de la semaine
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
      ) : !dailyData || dailyData.length === 0 ? (
        <div className="kpi-card h-[400px] flex items-center justify-center text-muted-foreground">
          Aucune donnée disponible pour la période sélectionnée
        </div>
      ) : (
        <>
          <div className="kpi-card h-[400px]">
            <h3 className="font-display font-semibold text-lg mb-4">Cycles par jour de la semaine</h3>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={dailyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="day" 
                  tick={{ fontSize: 12 }}
                  stroke="hsl(var(--muted-foreground))"
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
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="kpi-card">
            <h3 className="font-display font-semibold text-lg mb-4">Détail par jour</h3>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jour</TableHead>
                    <TableHead className="text-right">Nombre de cycles</TableHead>
                    <TableHead className="text-right">% du total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailyData.map((row) => (
                    <TableRow key={row.day}>
                      <TableCell className="font-medium">{row.day}</TableCell>
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
