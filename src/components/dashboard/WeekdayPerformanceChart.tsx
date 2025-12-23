import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const maxRevenue = Math.max(...data.map(d => d.revenue));
  
  return (
    <Card data-pdf-chart="weekday-performance" className={cn("", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          CA par jour de la semaine
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis 
                dataKey="day" 
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}€`}
              />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  `${value.toLocaleString('fr-FR')} €`,
                  name === 'revenue' ? 'CA' : 'Transactions'
                ]}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`}
                    fill={entry.revenue === maxRevenue ? 'hsl(72, 80%, 43%)' : 'hsl(var(--primary))'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
