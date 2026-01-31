import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface WeekdayData {
  day: string;
  revenue: number;
  transactions: number;
}

interface WeekdayPerformanceChartProps {
  data: WeekdayData[];
  className?: string;
}

export function WeekdayPerformanceChart({ data, className }: WeekdayPerformanceChartProps) {
  const maxRevenue = Math.max(...data.map(d => d.revenue), 1);
  
  return (
    <div data-pdf-chart="weekday-performance" className={cn("dashboard-card h-[320px]", className)}>
      <div className="dashboard-card-header">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <h3 className="dashboard-card-title">CA par jour de la semaine</h3>
        </div>
      </div>
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis 
              dataKey="day" 
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
              formatter={(value: number, name: string) => [
                `${value.toLocaleString('fr-FR')} €`,
                name === 'revenue' ? 'CA' : 'Transactions'
              ]}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                fontSize: '12px'
              }}
            />
            <Bar dataKey="revenue" radius={[3, 3, 0, 0]}>
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`}
                  fill={entry.revenue === maxRevenue ? 'hsl(var(--lavcom-green))' : 'hsl(var(--primary) / 0.7)'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
