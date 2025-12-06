import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface AverageMachinesData {
  day: string;
  average: number;
}

interface AverageMachinesChartProps {
  data: AverageMachinesData[];
}

export function AverageMachinesChart({ data }: AverageMachinesChartProps) {
  const maxValue = Math.max(...data.map(d => d.average));
  
  // Get color intensity based on value
  const getBarColor = (value: number) => {
    const intensity = value / maxValue;
    const lightness = 70 - (intensity * 40); // 70% to 30%
    return `hsl(var(--primary) / ${0.4 + intensity * 0.6})`;
  };

  return (
    <div className="kpi-card h-full">
      <h3 className="font-display font-semibold text-lg mb-4">
        Moyenne machines / jour
      </h3>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="day" 
              className="text-xs fill-muted-foreground"
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              className="text-xs fill-muted-foreground"
              tickLine={false}
              axisLine={false}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
              formatter={(value: number) => [`${value.toFixed(1)} machines`, "Moyenne"]}
            />
            <Bar 
              dataKey="average" 
              radius={[4, 4, 0, 0]}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.average)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
