import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { COMPARISON_STRINGS } from "@/constants/dashboard-simulator/comparison.strings";
import type { DashboardKpiSet } from "@/types/dashboard-simulator";

interface RoiProps {
  nameA: string;
  nameB: string;
  kpisA: DashboardKpiSet;
  kpisB: DashboardKpiSet;
}

/** Cumulative monthly result over 24 months. */
function trajectory(kpis: DashboardKpiSet): number[] {
  const monthly = kpis.monthlyResult ?? 0;
  const investment = (kpis.roiMonths ?? 0) * monthly;
  return Array.from({ length: 24 }, (_, i) => Math.round(monthly * (i + 1) - investment));
}

export function ComparisonRoiCard({ nameA, nameB, kpisA, kpisB }: RoiProps) {
  const a = trajectory(kpisA);
  const b = trajectory(kpisB);
  const data = a.map((value, index) => ({ month: index + 1, a: value, b: b[index] }));

  return (
    <Card className="shadow-form">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{COMPARISON_STRINGS.roiTitle}</CardTitle>
      </CardHeader>
      <CardContent className="h-[360px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="month"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              label={{
                value: COMPARISON_STRINGS.roiAxisMonth,
                position: "insideBottomRight",
                offset: -4,
                fill: "hsl(var(--muted-foreground))",
                fontSize: 12,
              }}
            />
            <YAxis
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              width={70}
              tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value: number) => `${new Intl.NumberFormat("fr-FR").format(value)} €`}
              labelFormatter={(label) => `${COMPARISON_STRINGS.roiAxisMonth} ${label}`}
            />
            <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />
            <Line type="monotone" dataKey="a" name={nameA} stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
            <Line
              type="monotone"
              dataKey="b"
              name={nameB}
              stroke="hsl(var(--muted-foreground))"
              dot={false}
              strokeWidth={2}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
