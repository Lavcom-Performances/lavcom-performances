import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

interface HourlyData {
  hour: string;
  cb: number;
  esp: number;
}

interface HourlyBarChartProps {
  data: HourlyData[];
}

export function HourlyBarChart({ data }: HourlyBarChartProps) {
  return (
    <div className="h-[140px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
          <XAxis 
            dataKey="hour" 
            tick={{ fontSize: 10 }} 
            axisLine={false}
            tickLine={false}
          />
          <YAxis 
            tick={{ fontSize: 10 }} 
            axisLine={false}
            tickLine={false}
            width={25}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px'
            }}
            formatter={(value: number) => [`${value.toFixed(2)} €`]}
          />
          <Bar dataKey="esp" stackId="a" fill="hsl(var(--chart-esp))" radius={[0, 0, 0, 0]} />
          <Bar dataKey="cb" stackId="a" fill="hsl(var(--chart-cb))" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
