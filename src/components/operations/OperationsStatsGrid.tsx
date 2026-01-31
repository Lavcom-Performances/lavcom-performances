import { CreditCard, Cpu } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

interface OperationsStatsGridProps {
  hourlyData: Array<{ hour: string; cb: number; esp: number }>;
  machineCounts: Array<{ name: string; count: number }>;
}

export function OperationsStatsGrid({ hourlyData, machineCounts }: OperationsStatsGridProps) {
  const totalMachines = machineCounts.length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* CA par heure */}
      <div className="dashboard-card">
        <div className="dashboard-card-header">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <CreditCard className="h-4 w-4 text-primary" />
            </div>
            <h3 className="dashboard-card-title">CA par heure</h3>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: 'hsl(var(--chart-cb))' }}></div>
              <span className="text-muted-foreground">CB</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: 'hsl(var(--chart-esp))' }}></div>
              <span className="text-muted-foreground">ESP</span>
            </div>
          </div>
        </div>
        
        <div className="h-[160px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourlyData} barGap={0}>
              <XAxis 
                dataKey="hour" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                interval={2}
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  fontSize: '12px',
                }}
                formatter={(value: number, name: string) => [
                  `${value.toFixed(2)} €`,
                  name === 'cb' ? 'CB' : 'ESP'
                ]}
              />
              <Bar dataKey="cb" stackId="a" fill="hsl(var(--chart-cb))" radius={[0, 0, 0, 0]} />
              <Bar dataKey="esp" stackId="a" fill="hsl(var(--chart-esp))" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Machines */}
      <div className="dashboard-card">
        <div className="dashboard-card-header">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
              <Cpu className="h-4 w-4 text-foreground" />
            </div>
            <h3 className="dashboard-card-title">Machines</h3>
          </div>
          {machineCounts.length > 0 && (
            <span className="text-xs font-semibold text-muted-foreground tabular-nums">
              Total: {totalMachines}
            </span>
          )}
        </div>
        
        <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
          {machineCounts.slice(0, 8).map((machine) => (
            <div key={machine.name} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/30">
              <div className="flex items-center gap-2.5">
                <span className="text-sm font-bold text-primary w-6 text-center tabular-nums">{machine.count}</span>
                <span className="text-sm text-foreground truncate max-w-[200px]">{machine.name}</span>
              </div>
            </div>
          ))}
          {machineCounts.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              Aucune machine
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
