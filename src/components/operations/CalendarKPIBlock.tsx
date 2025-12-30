import { CalendarDays, TrendingUp, CreditCard, Banknote, Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
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
    maximumFractionDigits: 2,
  }).format(value);
};

interface KPIRowProps {
  label: string;
  total: number;
  cb: number;
  esp: number;
  icon: React.ReactNode;
  isLoading?: boolean;
}

function KPIRow({ label, total, cb, esp, icon, isLoading }: KPIRowProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
        </div>
        <div className="flex items-center gap-4">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-16" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-primary" />
          <span className="font-semibold text-foreground">{formatCurrency(total)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CreditCard className="h-3.5 w-3.5 text-blue-500" />
          <span className="text-muted-foreground">{formatCurrency(cb)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Banknote className="h-3.5 w-3.5 text-emerald-500" />
          <span className="text-muted-foreground">{formatCurrency(esp)}</span>
        </div>
      </div>
    </div>
  );
}

export function CalendarKPIBlock({ siteId, className }: CalendarKPIBlockProps) {
  const { data, isLoading } = useOperationsCalendarKpis(siteId);

  return (
    <div className={cn(
      "rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm p-4",
      className
    )}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Chiffre d'affaires calendaire</h3>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-[240px]">
              <p className="text-xs">
                Totaux fixes basés sur le calendrier (indépendants des filtres sélectionnés)
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="space-y-0">
        <KPIRow
          label="Aujourd'hui"
          total={data?.day.revenue_total ?? 0}
          cb={data?.day.revenue_cb ?? 0}
          esp={data?.day.revenue_esp ?? 0}
          icon={<span className="text-xs font-bold text-orange-500">J</span>}
          isLoading={isLoading}
        />
        <KPIRow
          label="Mois en cours"
          total={data?.month.revenue_total ?? 0}
          cb={data?.month.revenue_cb ?? 0}
          esp={data?.month.revenue_esp ?? 0}
          icon={<span className="text-xs font-bold text-blue-500">M</span>}
          isLoading={isLoading}
        />
        <KPIRow
          label="Année en cours"
          total={data?.year.revenue_total ?? 0}
          cb={data?.year.revenue_cb ?? 0}
          esp={data?.year.revenue_esp ?? 0}
          icon={<span className="text-xs font-bold text-purple-500">A</span>}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
