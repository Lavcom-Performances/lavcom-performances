import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

interface CategoryPieChartProps {
  data: Array<{
    name: string;
    value: number;
    color: string;
  }>;
}

export function CategoryPieChart({ data }: CategoryPieChartProps) {
  const filteredData = data.filter(d => d.value > 0);

  return (
    <div className="dashboard-card h-[360px]">
      <div className="dashboard-card-header">
        <h3 className="dashboard-card-title">Répartition du CA</h3>
      </div>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={filteredData}
              cx="50%"
              cy="45%"
              innerRadius={55}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
            >
              {filteredData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
                fontSize: "12px",
              }}
              formatter={(value: number) => [`${value.toFixed(2)} €`, ""]}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              formatter={(value) => <span className="text-xs text-foreground">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
