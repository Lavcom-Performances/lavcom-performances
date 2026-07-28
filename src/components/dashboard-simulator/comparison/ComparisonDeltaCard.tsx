import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeltaPill } from "@/components/dashboard-simulator/shared/DeltaPill";
import { KPI_STRINGS } from "@/constants/dashboard-simulator/common.strings";
import { COMPARISON_STRINGS } from "@/constants/dashboard-simulator/comparison.strings";
import { fillTemplate, formatEuro } from "@/components/dashboard-simulator/shared/format";
import type { DashboardKpiSet } from "@/types/dashboard-simulator";

interface ComparisonDeltaCardProps {
  nameA: string;
  nameB: string;
  kpisA: DashboardKpiSet;
  kpisB: DashboardKpiSet;
}

function diff(a: number | null, b: number | null): number | null {
  if (a === null || b === null) return null;
  return a - b;
}

export function ComparisonDeltaCard({ nameA, nameB, kpisA, kpisB }: ComparisonDeltaCardProps) {
  const rows: Array<{ label: string; value: number | null; invert?: boolean }> = [
    { label: COMPARISON_STRINGS.delta.result, value: diff(kpisA.monthlyResult, kpisB.monthlyResult) },
    {
      label: COMPARISON_STRINGS.delta.revenue,
      value: diff(kpisA.estimatedRevenue, kpisB.estimatedRevenue),
    },
    { label: COMPARISON_STRINGS.delta.costs, value: diff(kpisA.fixedCosts, kpisB.fixedCosts), invert: true },
    { label: COMPARISON_STRINGS.delta.breakEven, value: diff(kpisA.breakEven, kpisB.breakEven), invert: true },
  ];

  return (
    <Card className="shadow-form">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {fillTemplate(COMPARISON_STRINGS.deltaTitle, { a: nameA, b: nameB })}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {rows.map((row) => (
          <div key={row.label} className="rounded-lg border p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{row.label}</p>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="text-sm font-semibold tabular-nums">
                {row.value === null ? "–" : formatEuro(Math.abs(row.value))}
              </span>
              <DeltaPill value={row.value} invert={row.invert} />
            </div>
          </div>
        ))}
        <p className="col-span-full text-xs text-muted-foreground">{KPI_STRINGS.breakEvenShort}</p>
      </CardContent>
    </Card>
  );
}
