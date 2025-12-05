import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DailyRevenueChartProps {
  data: Array<{
    date: string;
    revenue: number;
  }>;
}

export function DailyRevenueChart({ data }: DailyRevenueChartProps) {
  return (
    <div className="kpi-card h-[400px]">
      <h3 className="font-display font-semibold text-lg mb-4">CA par jour</h3>
      <ResponsiveContainer width="100%" height="90%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="date" 
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
          <Line 
            type="monotone"
            dataKey="revenue" 
            name="CA" 
            stroke="hsl(var(--lavcom-green))"
            strokeWidth={2}
            dot={{ fill: "hsl(var(--lavcom-green))", strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, fill: "hsl(var(--lavcom-yellow))" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
