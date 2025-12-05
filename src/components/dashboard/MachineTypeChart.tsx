import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface MachineTypeChartProps {
  data: Array<{
    type: string;
    ca: number;
    cycles: number;
  }>;
}

export function MachineTypeChart({ data }: MachineTypeChartProps) {
  return (
    <div className="kpi-card h-[400px]">
      <h3 className="font-display font-semibold text-lg mb-4">CA et cycles par type de machine</h3>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="type" 
            tick={{ fontSize: 12 }}
            stroke="hsl(var(--muted-foreground))"
          />
          <YAxis 
            yAxisId="ca"
            tick={{ fontSize: 12 }}
            stroke="hsl(var(--muted-foreground))"
            tickFormatter={(value) => `${value}€`}
          />
          <YAxis 
            yAxisId="cycles"
            orientation="right"
            tick={{ fontSize: 12 }}
            stroke="hsl(var(--muted-foreground))"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
            formatter={(value: number, name: string) => [
              name === "CA" ? `${value.toFixed(2)} €` : value,
              name
            ]}
          />
          <Legend />
          <Bar 
            yAxisId="ca"
            dataKey="ca" 
            name="CA" 
            fill="hsl(var(--lavcom-green))"
            radius={[4, 4, 0, 0]}
          />
          <Bar 
            yAxisId="cycles"
            dataKey="cycles" 
            name="Cycles" 
            fill="hsl(var(--lavcom-yellow))"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
