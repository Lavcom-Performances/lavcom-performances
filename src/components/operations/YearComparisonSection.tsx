import { useMemo, useState } from "react";
import { format, getYear, startOfYear, endOfYear, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { TrendingUp, TrendingDown, Minus, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Operation } from "@/hooks/useOperations";

interface YearComparisonSectionProps {
  operations: Operation[];
}

interface YearStats {
  year: number;
  total: number;
  cb: number;
  esp: number;
  transactions: number;
  avgBasket: number;
  monthlyData: { month: string; total: number; cb: number; esp: number }[];
}

const calculateYearStats = (operations: Operation[], year: number): YearStats => {
  const yearOps = operations.filter(op => {
    const opYear = getYear(parseISO(op.operation_date));
    return opYear === year;
  });

  const total = yearOps.reduce((sum, op) => sum + Number(op.amount), 0);
  const cbOps = yearOps.filter(op => op.payment_mode?.toUpperCase() === "CB");
  const espOps = yearOps.filter(op => op.payment_mode?.toUpperCase() === "ESP");
  const cb = cbOps.reduce((sum, op) => sum + Number(op.amount), 0);
  const esp = espOps.reduce((sum, op) => sum + Number(op.amount), 0);

  // Monthly breakdown
  const monthlyMap: Record<number, { total: number; cb: number; esp: number }> = {};
  for (let m = 0; m < 12; m++) {
    monthlyMap[m] = { total: 0, cb: 0, esp: 0 };
  }
  
  yearOps.forEach(op => {
    const month = parseISO(op.operation_date).getMonth();
    const amount = Number(op.amount);
    monthlyMap[month].total += amount;
    if (op.payment_mode?.toUpperCase() === "CB") {
      monthlyMap[month].cb += amount;
    } else if (op.payment_mode?.toUpperCase() === "ESP") {
      monthlyMap[month].esp += amount;
    }
  });

  const monthlyData = Object.entries(monthlyMap).map(([m, data]) => ({
    month: format(new Date(year, parseInt(m), 1), "MMM", { locale: fr }),
    ...data,
  }));

  return {
    year,
    total,
    cb,
    esp,
    transactions: yearOps.length,
    avgBasket: yearOps.length > 0 ? total / yearOps.length : 0,
    monthlyData,
  };
};

const PercentChange = ({ current, previous }: { current: number; previous: number }) => {
  if (previous === 0) {
    if (current === 0) return <span className="text-muted-foreground text-sm">—</span>;
    return <span className="text-green-600 text-sm flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Nouveau</span>;
  }
  
  const change = ((current - previous) / previous) * 100;
  
  if (Math.abs(change) < 0.5) {
    return <span className="text-muted-foreground text-sm flex items-center gap-1"><Minus className="h-3 w-3" /> 0%</span>;
  }
  
  if (change > 0) {
    return (
      <span className="text-green-600 text-sm flex items-center gap-1">
        <TrendingUp className="h-3 w-3" /> +{change.toFixed(1)}%
      </span>
    );
  }
  
  return (
    <span className="text-red-600 text-sm flex items-center gap-1">
      <TrendingDown className="h-3 w-3" /> {change.toFixed(1)}%
    </span>
  );
};

export function YearComparisonSection({ operations }: YearComparisonSectionProps) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [comparisonYear, setComparisonYear] = useState(currentYear - 1);

  // Get available years from operations
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    operations.forEach(op => {
      years.add(getYear(parseISO(op.operation_date)));
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [operations]);

  const selectedStats = useMemo(() => 
    calculateYearStats(operations, selectedYear), 
    [operations, selectedYear]
  );
  
  const comparisonStats = useMemo(() => 
    calculateYearStats(operations, comparisonYear), 
    [operations, comparisonYear]
  );

  if (availableYears.length < 2) {
    return null; // Don't show comparison if less than 2 years of data
  }

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5 text-primary" />
            Comparaison annuelle
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground">vs</span>
            <Select value={comparisonYear.toString()} onValueChange={(v) => setComparisonYear(parseInt(v))}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary comparison */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-xs text-muted-foreground uppercase mb-1">CA Total</p>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{selectedYear}</span>
                <span className="font-bold text-primary">{formatCurrency(selectedStats.total)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{comparisonYear}</span>
                <span className="text-muted-foreground">{formatCurrency(comparisonStats.total)}</span>
              </div>
              <div className="pt-1 border-t">
                <PercentChange current={selectedStats.total} previous={comparisonStats.total} />
              </div>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-xs text-muted-foreground uppercase mb-1">CA CB</p>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{selectedYear}</span>
                <span className="font-bold">{formatCurrency(selectedStats.cb)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{comparisonYear}</span>
                <span className="text-muted-foreground">{formatCurrency(comparisonStats.cb)}</span>
              </div>
              <div className="pt-1 border-t">
                <PercentChange current={selectedStats.cb} previous={comparisonStats.cb} />
              </div>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-xs text-muted-foreground uppercase mb-1">CA Espèces</p>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{selectedYear}</span>
                <span className="font-bold">{formatCurrency(selectedStats.esp)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{comparisonYear}</span>
                <span className="text-muted-foreground">{formatCurrency(comparisonStats.esp)}</span>
              </div>
              <div className="pt-1 border-t">
                <PercentChange current={selectedStats.esp} previous={comparisonStats.esp} />
              </div>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-xs text-muted-foreground uppercase mb-1">Transactions</p>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{selectedYear}</span>
                <span className="font-bold">{selectedStats.transactions.toLocaleString('fr-FR')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{comparisonYear}</span>
                <span className="text-muted-foreground">{comparisonStats.transactions.toLocaleString('fr-FR')}</span>
              </div>
              <div className="pt-1 border-t">
                <PercentChange current={selectedStats.transactions} previous={comparisonStats.transactions} />
              </div>
            </div>
          </div>
        </div>

        {/* Monthly comparison bars */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Évolution mensuelle</p>
          <div className="grid grid-cols-12 gap-1">
            {selectedStats.monthlyData.map((month, idx) => {
              const maxValue = Math.max(
                ...selectedStats.monthlyData.map(m => m.total),
                ...comparisonStats.monthlyData.map(m => m.total),
                1
              );
              const selectedHeight = (month.total / maxValue) * 100;
              const comparisonHeight = (comparisonStats.monthlyData[idx]?.total / maxValue) * 100;
              
              return (
                <div key={month.month} className="flex flex-col items-center">
                  <div className="h-20 w-full flex items-end gap-0.5">
                    <div 
                      className="flex-1 bg-primary/20 rounded-t transition-all duration-300"
                      style={{ height: `${comparisonHeight}%` }}
                      title={`${comparisonYear}: ${formatCurrency(comparisonStats.monthlyData[idx]?.total || 0)}`}
                    />
                    <div 
                      className="flex-1 bg-primary rounded-t transition-all duration-300"
                      style={{ height: `${selectedHeight}%` }}
                      title={`${selectedYear}: ${formatCurrency(month.total)}`}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground mt-1 capitalize">{month.month}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-center gap-4 mt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-primary rounded" />
              <span className="text-xs text-muted-foreground">{selectedYear}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-primary/20 rounded" />
              <span className="text-xs text-muted-foreground">{comparisonYear}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}