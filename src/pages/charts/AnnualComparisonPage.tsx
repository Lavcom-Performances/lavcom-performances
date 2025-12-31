import { useDateRange } from "@/hooks/useDateRange";
import { useAnnualComparison } from "@/hooks/useChartsData";
import { useChartPreferences } from "@/hooks/useChartPreferences";
import { useHasData } from "@/hooks/useHasData";
import { ChartPageFilters } from "@/components/charts/ChartPageFilters";
import { ChartEmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function AnnualComparisonPage() {
  const { dateRange, setDateRange } = useDateRange();
  const { filters, setFilters, isLoaded } = useChartPreferences("annual_comparison");
  const { data, isLoading } = useAnnualComparison(filters);
  const { hasData, isLoading: isLoadingHasData } = useHasData();
  const { monthlyData, yearTotals, years } = data ?? { monthlyData: [], yearTotals: {}, years: [] };

  const formatCurrency = (value: number | null) => 
    value !== null && value > 0
      ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value)
      : "-";

  const getVariation = (current: number | null, previous: number | null) => {
    if (current === null || previous === null || previous === 0 || current === 0) return null;
    return ((current - previous) / previous * 100).toFixed(1);
  };

  const currentYear = new Date().getFullYear();
  const previousYear = currentYear - 1;

  if (!isLoaded || isLoadingHasData) {
    return (
      <div className="p-6 lg:p-8">
        <Skeleton className="h-[500px]" />
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="p-6 lg:p-8">
        <ChartEmptyState />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
            CA Annuel Comparatif
          </h1>
          <p className="text-muted-foreground">
            Évolution du chiffre d'affaires par année
          </p>
        </div>
        <ChartPageFilters
          dateRange={dateRange}
          onDateChange={setDateRange}
          filters={filters}
          onFiltersChange={setFilters}
          showMachineType
          showMachine
          showPaymentMode
          showDayOfWeek
        />
      </div>

      {isLoading ? (
        <div className="kpi-card h-[500px]">
          <Skeleton className="h-full w-full" />
        </div>
      ) : monthlyData.length === 0 ? (
        <div className="kpi-card h-[400px] flex items-center justify-center text-muted-foreground">
          Aucune donnée disponible
        </div>
      ) : (
        <div className="kpi-card">
          <h3 className="font-display font-semibold text-lg mb-4">CA par mois et par année</h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Mois</TableHead>
                  {years?.map((year: number) => (
                    <TableHead key={year} className={`text-right ${year === currentYear ? 'font-semibold' : ''}`}>
                      {year}
                    </TableHead>
                  ))}
                  <TableHead className="text-right text-muted-foreground">Évolution</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyData.map((row: any) => {
                  const currentValue = row[`y${currentYear}`];
                  const previousValue = row[`y${previousYear}`];
                  const variation = getVariation(currentValue, previousValue);
                  return (
                    <TableRow key={row.month}>
                      <TableCell className="font-medium">{row.month}</TableCell>
                      {years?.map((year: number) => (
                        <TableCell 
                          key={year} 
                          className={`text-right ${year === currentYear ? 'font-semibold text-primary' : ''}`}
                        >
                          {formatCurrency(row[`y${year}`])}
                        </TableCell>
                      ))}
                      <TableCell className={`text-right ${variation && parseFloat(variation) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {variation ? `${parseFloat(variation) >= 0 ? '+' : ''}${variation}%` : '-'}
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell>TOTAL</TableCell>
                  {years?.map((year: number) => (
                    <TableCell 
                      key={year} 
                      className={`text-right ${year === currentYear ? 'text-primary' : ''}`}
                    >
                      {formatCurrency(yearTotals?.[`y${year}`] ?? 0)}
                    </TableCell>
                  ))}
                  <TableCell className={`text-right ${
                    getVariation(yearTotals?.[`y${currentYear}`], yearTotals?.[`y${previousYear}`]) && 
                    parseFloat(getVariation(yearTotals?.[`y${currentYear}`], yearTotals?.[`y${previousYear}`]) || '0') >= 0 
                      ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {getVariation(yearTotals?.[`y${currentYear}`], yearTotals?.[`y${previousYear}`]) 
                      ? `${parseFloat(getVariation(yearTotals?.[`y${currentYear}`], yearTotals?.[`y${previousYear}`]) || '0') >= 0 ? '+' : ''}${getVariation(yearTotals?.[`y${currentYear}`], yearTotals?.[`y${previousYear}`])}%` 
                      : '-'}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
