import { useMemo } from "react";
import { TrendingUp, CreditCard, Banknote, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

interface OperationsStatsGridProps {
  kpis: {
    day: { total: number; cb: number; esp: number };
    month: { total: number; cb: number; esp: number };
    year: { total: number; cb: number; esp: number };
  };
  hourlyData: Array<{ hour: string; cb: number; esp: number }>;
  machineCounts: Array<{ name: string; count: number }>;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export function OperationsStatsGrid({ kpis, hourlyData, machineCounts }: OperationsStatsGridProps) {
  const totalMachines = machineCounts.length;
  const totalTransactions = machineCounts.reduce((sum, m) => sum + m.count, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Bloc 1: CA Jour/Mois/Année */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <h3 className="font-semibold text-foreground">Chiffre d'affaires</h3>
        </div>
        
        <div className="space-y-3">
          {/* Jour */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold bg-lavcom-green text-white px-2 py-1 rounded">JOUR</span>
              <span className="text-lg font-bold text-foreground">{formatCurrency(kpis.day.total)} €</span>
            </div>
            <div className="flex gap-2 text-xs">
              <span className="text-muted-foreground">CB <span className="font-medium text-foreground">{formatCurrency(kpis.day.cb)} €</span></span>
              <span className="text-muted-foreground">ESP <span className="font-medium text-foreground">{formatCurrency(kpis.day.esp)} €</span></span>
            </div>
          </div>
          
          {/* Mois */}
          <div className="flex items-center justify-between bg-primary/5 -mx-5 px-5 py-2 border-y border-primary/10">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold bg-lavcom-green text-white px-2 py-1 rounded">MOIS</span>
              <span className="text-xl font-bold text-foreground">{formatCurrency(kpis.month.total)} €</span>
            </div>
            <div className="flex gap-2 text-xs">
              <span className="text-muted-foreground">CB <span className="font-medium text-foreground">{formatCurrency(kpis.month.cb)} €</span></span>
              <span className="text-muted-foreground">ESP <span className="font-medium text-foreground">{formatCurrency(kpis.month.esp)} €</span></span>
            </div>
          </div>
          
          {/* Année */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold bg-muted text-muted-foreground px-2 py-1 rounded">ANNÉE</span>
              <span className="text-lg font-bold text-foreground">{formatCurrency(kpis.year.total)} €</span>
            </div>
            <div className="flex gap-2 text-xs">
              <span className="text-muted-foreground">CB <span className="font-medium text-foreground">{formatCurrency(kpis.year.cb)} €</span></span>
              <span className="text-muted-foreground">ESP <span className="font-medium text-foreground">{formatCurrency(kpis.year.esp)} €</span></span>
            </div>
          </div>
        </div>
      </div>

      {/* Bloc 2: Graphique CA par heure CB + ESP */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-chart-cb/20 flex items-center justify-center">
              <CreditCard className="h-4 w-4 text-chart-cb" />
            </div>
            <h3 className="font-semibold text-foreground">CA par heure</h3>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: 'hsl(var(--chart-cb))' }}></div>
              <span className="text-muted-foreground">CB</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: 'hsl(var(--chart-esp))' }}></div>
              <span className="text-muted-foreground">ESP</span>
            </div>
          </div>
        </div>
        
        <div className="h-[140px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourlyData} barGap={0}>
              <XAxis 
                dataKey="hour" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                interval={2}
              />
              <YAxis 
                hide 
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value: number, name: string) => [
                  `${value.toFixed(2)} €`,
                  name === 'cb' ? 'Carte bancaire' : 'Espèces'
                ]}
                labelStyle={{ fontWeight: 600 }}
              />
              <Bar dataKey="cb" stackId="a" fill="hsl(var(--chart-cb))" radius={[0, 0, 0, 0]} />
              <Bar dataKey="esp" stackId="a" fill="hsl(var(--chart-esp))" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bloc 3: Nombre de machines */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-accent/50 flex items-center justify-center">
            <Cpu className="h-4 w-4 text-foreground" />
          </div>
          <h3 className="font-semibold text-foreground">Machines</h3>
        </div>
        
        <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
          {machineCounts.slice(0, 8).map((machine) => (
            <div key={machine.name} className="flex items-center justify-between py-1 border-b border-border/50 last:border-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-lavcom-green w-6 text-center">{machine.count}</span>
                <span className="text-sm text-foreground truncate max-w-[140px]">{machine.name}</span>
              </div>
            </div>
          ))}
          {machineCounts.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucune machine
            </p>
          )}
        </div>
        
        {machineCounts.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total machines</span>
            <span className="font-bold text-foreground">{totalMachines}</span>
          </div>
        )}
      </div>
    </div>
  );
}
