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
    <div className="dashboard-card h-[360px]">
      <div className="dashboard-card-header">
        <h3 className="dashboard-card-title">CA par jour</h3>
      </div>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}€`}
              width={50}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
                fontSize: "12px",
              }}
              formatter={(value: number) => [`${value.toFixed(2)} €`, "CA"]}
            />
            <Line 
              type="monotone"
              dataKey="revenue" 
              name="CA" 
              stroke="hsl(var(--lavcom-green))"
              strokeWidth={2}
              dot={{ fill: "hsl(var(--lavcom-green))", strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5, fill: "hsl(var(--lavcom-yellow))" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
