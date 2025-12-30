import { BarChart3, Cpu } from "lucide-react";
import { useOperationsCalendarKpis } from "@/hooks/useOperationsCalendarKpis";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";

interface OperationsKPIRowProps {
  siteId: string | undefined;
  hourlyData: Array<{ hour: string; cb: number; esp: number }>;
  machineCounts: Array<{ name: string; count: number }>;
  className?: string;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

function LoadingPulse({ className }: { className?: string }) {
  return (
    <div className={cn(
      "animate-pulse bg-muted/60 rounded",
      className
    )} />
  );
}

interface CARowProps {
  label: string;
  total: number;
  cb: number;
  esp: number;
  variant: "day" | "month" | "year";
  isLoading?: boolean;
}

function CARow({ label, total, cb, esp, variant, isLoading }: CARowProps) {
  const variantStyles = {
    day: {
      badge: "bg-lavcom-green text-white",
      totalBg: "bg-lavcom-green/10",
    },
    month: {
      badge: "bg-lavcom-green text-white",
      totalBg: "bg-lavcom-green/15",
    },
    year: {
      badge: "bg-muted-foreground/80 text-white",
      totalBg: "bg-muted/50",
    },
  };

  const styles = variantStyles[variant];
  const isHighlighted = variant === "month";

  return (
    <div className={cn(
      "flex items-center gap-3 py-2 transition-colors",
      isHighlighted && "bg-lavcom-green/5 -mx-4 px-4 border-y border-lavcom-green/10"
    )}>
      {/* Label badge */}
      <div className={cn(
        "text-[10px] font-bold uppercase px-1.5 py-0.5 rounded tracking-wide shrink-0 w-12 text-center",
        styles.badge
      )}>
        {label}
      </div>
      
      {/* Total */}
      <div className={cn(
        "px-3 py-1.5 rounded-md min-w-[85px]",
        styles.totalBg
      )}>
        {isLoading ? (
          <LoadingPulse className="h-5 w-14" />
        ) : (
          <span className={cn(
            "font-bold text-foreground block",
            isHighlighted ? "text-lg" : "text-base"
          )}>
            {formatCurrency(total)} €
          </span>
        )}
        <div className="text-[9px] text-muted-foreground uppercase tracking-wide">CA Total</div>
      </div>
      
      {/* CB */}
      <div className="text-center min-w-[60px]">
        {isLoading ? (
          <LoadingPulse className="h-4 w-12 mx-auto" />
        ) : (
          <span className="font-semibold text-foreground text-sm block">{formatCurrency(cb)} €</span>
        )}
        <div className="text-[9px] text-muted-foreground uppercase">CA CB</div>
      </div>
      
      {/* ESP */}
      <div className="text-center min-w-[60px]">
        {isLoading ? (
          <LoadingPulse className="h-4 w-12 mx-auto" />
        ) : (
          <span className="font-semibold text-foreground text-sm block">{formatCurrency(esp)} €</span>
        )}
        <div className="text-[9px] text-muted-foreground uppercase">CA ESP</div>
      </div>
    </div>
  );
}

export function OperationsKPIRow({ siteId, hourlyData, machineCounts, className }: OperationsKPIRowProps) {
  const { data, isLoading } = useOperationsCalendarKpis(siteId);
  const totalMachines = machineCounts.length;

  // Calculate max for chart scaling
  const maxHourlyValue = Math.max(...hourlyData.map(d => d.cb + d.esp), 1);

  return (
    <div className={cn(
      "grid grid-cols-1 lg:grid-cols-[1fr_1.2fr_0.8fr] gap-4",
      className
    )}>
      {/* Bloc 1: CA Calendaire */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
        <div className="space-y-1">
          <CARow 
            label="Jour" 
            total={data?.day.revenue_total ?? 0} 
            cb={data?.day.revenue_cb ?? 0} 
            esp={data?.day.revenue_esp ?? 0}
            variant="day"
            isLoading={isLoading}
          />
          <CARow 
            label="Mois" 
            total={data?.month.revenue_total ?? 0} 
            cb={data?.month.revenue_cb ?? 0} 
            esp={data?.month.revenue_esp ?? 0}
            variant="month"
            isLoading={isLoading}
          />
          <CARow 
            label="Année" 
            total={data?.year.revenue_total ?? 0} 
            cb={data?.year.revenue_cb ?? 0} 
            esp={data?.year.revenue_esp ?? 0}
            variant="year"
            isLoading={isLoading}
          />
        </div>
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
