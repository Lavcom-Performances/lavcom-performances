import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeltaPill } from "@/components/dashboard-simulator/shared/DeltaPill";

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
        {rows.map((row) => {
          const positive = row.value === null ? null : row.invert ? row.value < 0 : row.value > 0;
          return (
            <div key={row.label} className="rounded-lg border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{row.label}</p>
              <div className="mt-1.5">
                <DeltaPill
                  label={row.value === null ? "–" : formatEuro(Math.abs(row.value))}
                  hint={
                    row.value === null
                      ? undefined
                      : positive
                        ? COMPARISON_STRINGS.advantage
                        : COMPARISON_STRINGS.loss
                  }
                  direction={positive === null ? "neutral" : positive ? "up" : "down"}
                />
              </div>
            </div>
          );
        })}

      </CardContent>
    </Card>
  );
}
