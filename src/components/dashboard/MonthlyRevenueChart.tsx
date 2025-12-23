import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface MonthlyRevenueChartProps {
  data: Array<{
    month: string;
    revenue: number;
  }>;
}

export function MonthlyRevenueChart({ data }: MonthlyRevenueChartProps) {
  return (
    <div data-pdf-chart="monthly-revenue" className="kpi-card h-[400px]">
      <h3 className="font-display font-semibold text-lg mb-4">CA par mois</h3>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="month" 
            tick={{ fontSize: 12 }}
            stroke="hsl(var(--muted-foreground))"
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            stroke="hsl(var(--muted-foreground))"
            tickFormatter={(value) => `${value}€`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
            formatter={(value: number) => [`${value.toFixed(2)} €`, "CA"]}
          />
          <Bar 
            dataKey="revenue" 
            name="CA" 
            fill="hsl(var(--lavcom-green))"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
