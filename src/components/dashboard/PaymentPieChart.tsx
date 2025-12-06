import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

// Payment colors: ESP = vert, CB = bleu, FI = gris
const COLORS = {
  esp: "hsl(72, 80%, 43%)",   // Lavcom green for Espèces
  cb: "#BED7F0",               // Blue for Carte bancaire
  fi: "#D9D9D9",               // Gray for Fidélité
};

interface PaymentPieChartProps {
  data: Array<{
    name: string;
    value: number;
    color: string;
  }>;
}

export function PaymentPieChart({ data }: PaymentPieChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="kpi-card h-[400px]">
      <h3 className="font-display font-semibold text-lg mb-4">Répartition des paiements</h3>
      <ResponsiveContainer width="100%" height="90%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="45%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
            label={({ name, value }) => `${((value / total) * 100).toFixed(0)}%`}
            labelLine={false}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
            formatter={(value: number) => [`${value.toFixed(2)} €`, ""]}
          />
          <Legend 
            verticalAlign="bottom" 
            height={36}
            formatter={(value) => <span className="text-sm text-foreground">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
