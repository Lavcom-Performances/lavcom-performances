import { useTranslation } from "react-i18next";
import { format, formatDistanceToNow } from "date-fns";
import { fr, enUS, de, es, it, nl } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import { 
  Calendar, 
  Upload, 
  Database, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2,
  Clock,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDataQuality, DataQualityWarning } from "@/hooks/useDataQuality";
import { useCurrentSite } from "@/hooks/useCurrentSite";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible";
import { useState } from "react";

const localeMap: Record<string, typeof fr> = {
  fr,
  en: enUS,
  de,
  es,
  it,
  nl,
};

interface DataQualityBlockProps {
  dateRange?: DateRange;
  className?: string;
  variant?: 'compact' | 'full';
}

export function DataQualityBlock({ 
  dateRange, 
  className,
  variant = 'compact',
}: DataQualityBlockProps) {
  const { t, i18n } = useTranslation(['app']);
  const locale = localeMap[i18n.language] || fr;
  const { currentSiteId, siteName } = useCurrentSite();
  const [isOpen, setIsOpen] = useState(false);

  const { data, isLoading } = useDataQuality({ dateRange, enabled: !!currentSiteId });

  if (isLoading) {
    return (
      <div className={cn("rounded-lg border bg-card p-4", className)}>
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      </div>
    );
  }

  if (!data || !currentSiteId) {
    return null;
  }

  const hasWarnings = data.warnings.length > 0;
  const hasErrors = data.warnings.some(w => w.severity === 'error');

  // Format helpers
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try {
      return format(new Date(dateStr), 'dd/MM/yyyy', { locale });
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try {
      return format(new Date(dateStr), 'dd/MM/yyyy HH:mm', { locale });
    } catch {
      return dateStr;
    }
  };

  const formatRelative = (dateStr: string | null) => {
    if (!dateStr) return '';
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale });
    } catch {
      return '';
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(i18n.language, {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Build report issue URL
  const buildReportUrl = () => {
    const params = new URLSearchParams({
      site_id: currentSiteId,
      site_name: siteName || '',
      provider: data.provider || 'unknown',
      period: `${data.periodStart || ''} - ${data.periodEnd || ''}`,
      warnings: data.warnings.map(w => w.type).join(','),
    });
    return `/help?prefill=${encodeURIComponent(params.toString())}`;
  };

  // Status indicator
  const StatusIcon = hasErrors ? AlertTriangle : hasWarnings ? AlertTriangle : CheckCircle2;
  const statusColor = hasErrors 
    ? 'text-destructive' 
    : hasWarnings 
      ? 'text-yellow-600 dark:text-yellow-400' 
      : 'text-green-600 dark:text-green-400';

  if (variant === 'compact') {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className={cn(
          "rounded-lg border bg-card overflow-hidden",
          hasErrors && "border-destructive/50",
          hasWarnings && !hasErrors && "border-yellow-400/50",
          className
        )}>
          {/* Header - always visible */}
          <CollapsibleTrigger asChild>
            <button className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors text-left">
              <div className="flex items-center gap-3">
                <StatusIcon className={cn("h-4 w-4 shrink-0", statusColor)} />
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Database className="h-3.5 w-3.5" />
                    <span className="font-medium text-foreground">{data.operationsCount.toLocaleString()}</span>
                    <span>opérations</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <TrendingUp className="h-3.5 w-3.5" />
                    <span className="font-medium text-foreground">{formatCurrency(data.totalRevenue)}</span>
                  </span>
                  {data.periodStart && data.periodEnd && (
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{formatDate(data.periodStart)} → {formatDate(data.periodEnd)}</span>
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hasWarnings && (
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full",
                    hasErrors ? "bg-destructive/10 text-destructive" : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                  )}>
                    {data.warnings.length} alerte{data.warnings.length > 1 ? 's' : ''}
                  </span>
                )}
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </button>
          </CollapsibleTrigger>

          {/* Expanded content */}
          <CollapsibleContent>
            <div className="px-4 pb-4 pt-2 border-t bg-muted/30">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <StatItem 
                  icon={Upload} 
                  label="Dernier import" 
                  value={formatDateTime(data.lastImportDate)}
                  subValue={formatRelative(data.lastImportDate)}
                />
                <StatItem 
                  icon={Calendar} 
                  label="Dernière opération" 
                  value={formatDate(data.lastOperationDate)}
                  subValue={formatRelative(data.lastOperationDate)}
                />
                <StatItem 
                  icon={Clock} 
                  label="Plage horaire" 
                  value={data.minHour !== null && data.maxHour !== null 
                    ? `${data.minHour}h — ${data.maxHour}h`
                    : '—'
                  }
                />
                <StatItem 
                  icon={Info} 
                  label="Provider" 
                  value={data.provider || 'Non détecté'}
                />
              </div>

              {/* Warnings */}
              {data.warnings.length > 0 && (
                <div className="space-y-2 mb-4">
                  {data.warnings.map((warning, idx) => (
                    <WarningItem key={idx} warning={warning} />
                  ))}
                </div>
              )}

              {/* Report issue link */}
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" asChild className="text-xs">
                  <a href={buildReportUrl()}>
                    <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                    Signaler un problème
                  </a>
                </Button>
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    );
  }

  // Full variant (for detailed views)
  return (
    <div className={cn(
      "rounded-lg border bg-card p-4",
      hasErrors && "border-destructive/50",
      hasWarnings && !hasErrors && "border-yellow-400/50",
      className
    )}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <StatusIcon className={cn("h-5 w-5", statusColor)} />
          <h3 className="font-semibold">Qualité des données</h3>
        </div>
        <Button variant="ghost" size="sm" asChild className="text-xs">
          <a href={buildReportUrl()}>
            <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
            Signaler un problème
          </a>
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
        <StatItem 
          icon={Upload} 
          label="Dernier import" 
          value={formatDateTime(data.lastImportDate)}
          subValue={formatRelative(data.lastImportDate)}
        />
        <StatItem 
          icon={Calendar} 
          label="Dernière opération" 
          value={formatDate(data.lastOperationDate)}
          subValue={formatRelative(data.lastOperationDate)}
        />
        <StatItem 
          icon={Info} 
          label="Provider" 
          value={data.provider || 'Non détecté'}
        />
        <StatItem 
          icon={Calendar} 
          label="Période couverte" 
          value={data.periodStart && data.periodEnd 
            ? `${formatDate(data.periodStart)} → ${formatDate(data.periodEnd)}`
            : '—'
          }
        />
        <StatItem 
          icon={Database} 
          label="Opérations" 
          value={data.operationsCount.toLocaleString()}
        />
        <StatItem 
          icon={TrendingUp} 
          label="CA période" 
          value={formatCurrency(data.totalRevenue)}
        />
      </div>

      {/* Warnings */}
      {data.warnings.length > 0 && (
        <div className="space-y-2">
          {data.warnings.map((warning, idx) => (
            <WarningItem key={idx} warning={warning} />
          ))}
        </div>
      )}
    </div>
  );
}

interface StatItemProps {
  icon: typeof Calendar;
  label: string;
  value: string;
  subValue?: string;
}

function StatItem({ icon: Icon, label, value, subValue }: StatItemProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3 w-3" />
        <span>{label}</span>
      </div>
      <p className="text-sm font-medium truncate" title={value}>{value}</p>
      {subValue && (
        <p className="text-xs text-muted-foreground truncate">{subValue}</p>
      )}
    </div>
  );
}

interface WarningItemProps {
  warning: DataQualityWarning;
}

function WarningItem({ warning }: WarningItemProps) {
  const isError = warning.severity === 'error';
  
  return (
    <div className={cn(
      "flex items-start gap-2 p-3 rounded-md text-sm",
      isError 
        ? "bg-destructive/10 text-destructive" 
        : "bg-yellow-50 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300"
    )}>
      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
      <div>
        <p className="font-medium">{warning.message}</p>
        <p className="text-xs opacity-80 mt-0.5">{warning.details}</p>
      </div>
    </div>
  );
}
