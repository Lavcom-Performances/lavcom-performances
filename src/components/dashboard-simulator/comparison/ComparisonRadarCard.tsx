import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { COMPARISON_STRINGS } from "@/constants/dashboard-simulator/comparison.strings";
import type { DashboardKpiSet } from "@/types/dashboard-simulator";

interface RadarProps {
  nameA: string;
  nameB: string;
  kpisA: DashboardKpiSet;
  kpisB: DashboardKpiSet;
}

/** Normalizes raw KPI values to a 0-100 comparable scale. */
function score(value: number | null, max: number, invert = false): number {
  if (value === null || max === 0) return 0;
  const ratio = Math.min(Math.abs(value) / max, 1) * 100;
  return Math.round(invert ? 100 - ratio : ratio);
}

export function ComparisonRadarCard({ nameA, nameB, kpisA, kpisB }: RadarProps) {
  const maxRevenue = Math.max(kpisA.estimatedRevenue ?? 0, kpisB.estimatedRevenue ?? 0, 1);
  const maxResult = Math.max(kpisA.monthlyResult ?? 0, kpisB.monthlyResult ?? 0, 1);
  const maxCosts = Math.max(kpisA.fixedCosts ?? 0, kpisB.fixedCosts ?? 0, 1);
  const maxBreakEven = Math.max(kpisA.breakEven ?? 0, kpisB.breakEven ?? 0, 1);
  const maxRoi = Math.max(kpisA.roiMonths ?? 0, kpisB.roiMonths ?? 0, 1);
  const maxVolume = Math.max(kpisA.cyclesPerDay ?? 0, kpisB.cyclesPerDay ?? 0, 1);

  const axes = COMPARISON_STRINGS.radarAxes;
  const data = [
    {
      axis: axes.revenue,
      a: score(kpisA.estimatedRevenue, maxRevenue),
      b: score(kpisB.estimatedRevenue, maxRevenue),
    },
    {
      axis: axes.margin,
      a: score(kpisA.monthlyResult, maxResult),
      b: score(kpisB.monthlyResult, maxResult),
    },
    {
      axis: axes.costs,
      a: score(kpisA.fixedCosts, maxCosts, true),
      b: score(kpisB.fixedCosts, maxCosts, true),
    },
    {
      axis: axes.breakEven,
      a: score(kpisA.breakEven, maxBreakEven, true),
      b: score(kpisB.breakEven, maxBreakEven, true),
    },
    { axis: axes.roi, a: score(kpisA.roiMonths, maxRoi, true), b: score(kpisB.roiMonths, maxRoi, true) },
    {
      axis: axes.volume,
      a: score(kpisA.cyclesPerDay, maxVolume),
      b: score(kpisB.cyclesPerDay, maxVolume),
    },
  ];

  return (
    <Card className="shadow-form">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{COMPARISON_STRINGS.radarTitle}</CardTitle>
      </CardHeader>
      <CardContent className="h-[360px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="70%">
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis
              dataKey="axis"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            <Radar
              name={nameA}
              dataKey="a"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.25}
            />
            <Radar
              name={nameB}
              dataKey="b"
              stroke="hsl(var(--chart-2, var(--muted-foreground)))"
              fill="hsl(var(--chart-2, var(--muted-foreground)))"
              fillOpacity={0.15}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
