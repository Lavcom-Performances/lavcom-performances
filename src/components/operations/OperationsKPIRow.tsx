import { BarChart3, Cpu, TrendingUp, TrendingDown, CreditCard, Banknote, ShoppingCart, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";

interface PeriodKpis {
  total: number;
  cb: number;
  esp: number;
  count: number;
}

interface Alert {
  type: "warning" | "info";
  message: string;
}

interface OperationsKPIRowProps {
  siteId: string | undefined;
  hourlyData: Array<{ hour: string; cb: number; esp: number }>;
  machineCounts: Array<{ name: string; count: number }>;
  periodKpis: PeriodKpis;
  alerts?: Alert[];
  className?: string;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export function OperationsKPIRow({ siteId, hourlyData, machineCounts, periodKpis, alerts = [], className }: OperationsKPIRowProps) {
  const totalMachines = machineCounts.length;
  const avgBasket = periodKpis.count > 0 ? periodKpis.total / periodKpis.count : 0;

  // Calculate max for chart scaling
  const maxHourlyValue = Math.max(...hourlyData.map(d => d.cb + d.esp), 1);

  return (
    <div className={cn(
      "grid grid-cols-1 lg:grid-cols-[1fr_1.2fr_0.8fr] gap-4",
      className
    )}>
      {/* Bloc 1: KPIs résumé période + alertes */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
          Résumé période
        </div>

        {/* Total CA */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-lavcom-green/15 flex items-center justify-center shrink-0">
            <TrendingUp className="h-4 w-4 text-lavcom-green" />
          </div>
          <div>
            <span className="text-xl font-bold text-foreground">{formatCurrency(periodKpis.total)} €</span>
            <div className="text-[9px] text-muted-foreground uppercase">CA Total</div>
          </div>
        </div>

        {/* CB / ESP / Panier moyen */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center px-2 py-1.5 rounded-md bg-blue-500/10">
            <CreditCard className="h-3 w-3 text-blue-500 mx-auto mb-0.5" />
            <span className="text-sm font-semibold text-foreground block">{formatCurrency(periodKpis.cb)} €</span>
            <div className="text-[9px] text-muted-foreground">CB</div>
          </div>
          <div className="text-center px-2 py-1.5 rounded-md bg-emerald-500/10">
            <Banknote className="h-3 w-3 text-emerald-500 mx-auto mb-0.5" />
            <span className="text-sm font-semibold text-foreground block">{formatCurrency(periodKpis.esp)} €</span>
            <div className="text-[9px] text-muted-foreground">ESP</div>
          </div>
          <div className="text-center px-2 py-1.5 rounded-md bg-amber-500/10">
            <ShoppingCart className="h-3 w-3 text-amber-500 mx-auto mb-0.5" />
            <span className="text-sm font-semibold text-foreground block">{avgBasket.toFixed(1)} €</span>
            <div className="text-[9px] text-muted-foreground">Panier</div>
          </div>
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="space-y-1 pt-1 border-t border-border/50">
            {alerts.map((alert, i) => (
              <div key={i} className={cn(
                "flex items-start gap-1.5 text-[11px] rounded px-2 py-1",
                alert.type === "warning" 
                  ? "text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20" 
                  : "text-blue-700 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20"
              )}>
                {alert.type === "warning" 
                  ? <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" /> 
                  : <CheckCircle2 className="h-3 w-3 mt-0.5 shrink-0" />}
                <span>{alert.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bloc 2: Graphique CA par heure */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <BarChart3 className="h-3.5 w-3.5" />
            <span>CA par heure</span>
          </div>
          <div className="flex items-center gap-3 text-[10px]">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm bg-lavcom-green"></div>
              <span className="text-muted-foreground">CB</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm bg-muted-foreground/40"></div>
              <span className="text-muted-foreground">ESP</span>
            </div>
          </div>
        </div>
        
        <div className="h-[130px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourlyData} barGap={1}>
              <XAxis 
                dataKey="hour" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                interval={1}
              />
              <YAxis 
                hide 
                domain={[0, maxHourlyValue * 1.1]}
              />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '11px',
                  padding: '6px 10px',
                }}
                formatter={(value: number, name: string) => [
                  `${value.toFixed(2)} €`,
                  name === 'cb' ? 'CB' : 'ESP'
                ]}
                labelStyle={{ fontWeight: 600, marginBottom: 4 }}
              />
              <Bar dataKey="esp" stackId="a" fill="hsl(var(--muted-foreground) / 0.3)" radius={[0, 0, 0, 0]} />
              <Bar dataKey="cb" stackId="a" fill="hsl(var(--lavcom-green))" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bloc 3: Machines */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
          <Cpu className="h-3.5 w-3.5" />
          <span>Machines</span>
        </div>
        
        <div className="space-y-1 max-h-[120px] overflow-y-auto">
          {machineCounts.slice(0, 10).map((machine, index) => (
            <div 
              key={machine.name} 
              className="flex items-center justify-between text-sm animate-fade-in"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <span className="font-bold text-lavcom-green w-6 text-right">{machine.count}</span>
              <span className="text-foreground flex-1 ml-3 truncate text-xs">{machine.name}</span>
            </div>
          ))}
          {machineCounts.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              Aucune machine
            </p>
          )}
        </div>
        
        {machineCounts.length > 0 && (
          <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground">Total</span>
            <span className="font-bold text-foreground">{totalMachines} machines</span>
          </div>
        )}
      </div>
    </div>
  );
}
