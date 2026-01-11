import { CalendarDays, TrendingUp, CreditCard, Banknote, Info, Sun, Calendar, CalendarRange } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useOperationsCalendarKpis } from "@/hooks/useOperationsCalendarKpis";
import { cn } from "@/lib/utils";

interface CalendarKPIBlockProps {
  siteId: string | undefined;
  className?: string;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

interface KPIRowProps {
  label: string;
  total: number;
  cb: number;
  esp: number;
  icon: React.ReactNode;
  variant: "day" | "month" | "year";
  isLoading?: boolean;
  index: number;
}

function LoadingPulse({ className }: { className?: string }) {
  return (
    <div className={cn(
      "animate-pulse bg-gradient-to-r from-muted/60 via-muted to-muted/60 rounded",
      "bg-[length:200%_100%] animate-[shimmer_1.5s_ease-in-out_infinite]",
      className
    )} />
  );
}

function KPIRow({ label, total, cb, esp, icon, variant, isLoading, index }: KPIRowProps) {
  const variantStyles = {
    day: {
      badge: "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-orange-500/25",
      row: "bg-gradient-to-r from-orange-500/5 to-transparent",
      accent: "text-orange-600 dark:text-orange-400",
    },
    month: {
      badge: "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-blue-500/25",
      row: "bg-gradient-to-r from-blue-500/8 to-transparent",
      accent: "text-blue-600 dark:text-blue-400",
    },
    year: {
      badge: "bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-violet-500/25",
      row: "bg-gradient-to-r from-violet-500/5 to-transparent",
      accent: "text-violet-600 dark:text-violet-400",
    },
  };

  const styles = variantStyles[variant];

  return (
    <div 
      className={cn(
        "flex items-center justify-between py-3.5 px-4 -mx-4 transition-all duration-300",
        "border-b border-border/30 last:border-0",
        styles.row,
        "hover:brightness-105",
        isLoading ? "" : "animate-fade-in"
      )}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          "flex items-center justify-center w-8 h-8 rounded-lg shadow-md",
          styles.badge
        )}>
          {icon}
        </div>
        <span className="text-sm font-medium text-foreground">{label}</span>
      </div>
      
      <div className="flex items-center gap-5">
        {isLoading ? (
          <>
            <LoadingPulse className="h-6 w-24" />
            <LoadingPulse className="h-5 w-16" />
            <LoadingPulse className="h-5 w-16" />
          </>
        ) : (
          <>
            {/* Total */}
            <div className="flex items-center gap-1.5">
              <TrendingUp className={cn("h-4 w-4", styles.accent)} />
              <span className={cn("text-lg font-bold", styles.accent)}>
                {formatCurrency(total)}
              </span>
            </div>
            
            {/* CB */}
            <div className="flex items-center gap-1.5 min-w-[80px]">
              <CreditCard className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-sm text-muted-foreground font-medium">
                {formatCurrency(cb)}
              </span>
            </div>
            
            {/* ESP */}
            <div className="flex items-center gap-1.5 min-w-[80px]">
              <Banknote className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-sm text-muted-foreground font-medium">
                {formatCurrency(esp)}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function CalendarKPIBlock({ siteId, className }: CalendarKPIBlockProps) {
  const { data, isLoading } = useOperationsCalendarKpis(siteId);

  return (
    <div className={cn(
      "rounded-xl border border-border bg-card shadow-sm overflow-hidden",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20">
            <CalendarDays className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">CA Calendaire</h3>
            <p className="text-xs text-muted-foreground">Basé sur le calendrier réel</p>
          </div>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center cursor-help hover:bg-muted/80 transition-colors">
                <Info className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-[300px]">
              <div className="text-xs space-y-1">
                <p className="font-medium">📅 KPIs calendrier réel</p>
                <p>Ces totaux sont calculés sur la date du jour, le mois en cours et l'année en cours.</p>
                <p className="text-muted-foreground">Ils ne changent pas avec les filtres de date ou de machine.</p>
                <p className="text-muted-foreground mt-2">💡 Le "Total période" en haut à droite correspond aux filtres sélectionnés.</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* KPI Rows */}
      <div className="px-4 py-1">
        <KPIRow
          label="Aujourd'hui"
          total={data?.day.revenue_total ?? 0}
          cb={data?.day.revenue_cb ?? 0}
          esp={data?.day.revenue_esp ?? 0}
          icon={<Sun className="h-4 w-4" />}
          variant="day"
          isLoading={isLoading}
          index={0}
        />
        <KPIRow
          label="Mois en cours"
          total={data?.month.revenue_total ?? 0}
          cb={data?.month.revenue_cb ?? 0}
          esp={data?.month.revenue_esp ?? 0}
          icon={<Calendar className="h-4 w-4" />}
          variant="month"
          isLoading={isLoading}
          index={1}
        />
        <KPIRow
          label="Année en cours"
          total={data?.year.revenue_total ?? 0}
          cb={data?.year.revenue_cb ?? 0}
          esp={data?.year.revenue_esp ?? 0}
          icon={<CalendarRange className="h-4 w-4" />}
          variant="year"
          isLoading={isLoading}
          index={2}
        />
      </div>
    </div>
  );
}
