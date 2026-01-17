import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp, BarChart3, TrendingUp, TrendingDown, Minus, Clock, CreditCard, Euro, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAnonymousBenchmarks, BenchmarksResult } from "@/hooks/useAnonymousBenchmarks";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";

interface Props {
  dateRange: DateRange | undefined;
}

type ComparisonBadge = 'above' | 'average' | 'below';

function getComparisonBadge(myValue: number, benchmarkValue: number): ComparisonBadge {
  if (benchmarkValue === 0) return 'average';
  const diff = ((myValue - benchmarkValue) / benchmarkValue) * 100;
  if (diff > 15) return 'above';
  if (diff < -15) return 'below';
  return 'average';
}

function ComparisonIndicator({ badge }: { badge: ComparisonBadge }) {
  const { t } = useTranslation('app');
  
  const config = {
    above: {
      icon: TrendingUp,
      className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
      label: t('benchmarks.badges.above'),
    },
    average: {
      icon: Minus,
      className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      label: t('benchmarks.badges.average'),
    },
    below: {
      icon: TrendingDown,
      className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      label: t('benchmarks.badges.below'),
    },
  };

  const { icon: Icon, className, label } = config[badge];

  return (
    <Badge variant="outline" className={cn("gap-1 text-xs font-medium", className)}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

function formatHour(hour: number): string {
  return `${hour}h`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

function getScopeLabel(scopeType: string | undefined, scopeCode: string | undefined, t: (key: string) => string): string {
  if (!scopeType || !scopeCode) return '';
  
  switch (scopeType) {
    case 'department':
      return t('benchmarks.scope.department').replace('{{code}}', scopeCode);
    case 'region':
      return t('benchmarks.scope.region').replace('{{code}}', scopeCode);
    case 'national':
      return t('benchmarks.scope.national');
    default:
      return '';
  }
}

export function AnonymousBenchmarksBlock({ dateRange }: Props) {
  const { t } = useTranslation('app');
  const [isExpanded, setIsExpanded] = useState(true);
  const { data, isLoading, error } = useAnonymousBenchmarks(dateRange);

  // Don't render if loading
  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-5 w-40" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Don't render if error or not available
  if (error || !data?.available) {
    // Show message only for insufficient sample
    if (data?.reason === 'insufficient_sample') {
      return (
        <Card className="border-border/50 bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <BarChart3 className="h-5 w-5" />
              <span className="text-sm">{t('benchmarks.unavailable')}</span>
            </div>
          </CardContent>
        </Card>
      );
    }
    // Don't render for other reasons (demo, no department, etc.)
    return null;
  }

  const { benchmark, my_values, scope_type, scope_code, n_sites } = data;
  
  if (!benchmark || !my_values) return null;

  const revenueBadge = getComparisonBadge(my_values.avg_daily_revenue, benchmark.median_daily_revenue);
  const cbBadge = getComparisonBadge(my_values.cb_share, benchmark.avg_cb_share);
  
  // For hours, we just compare if they overlap
  const myTopHours = my_values.top_hours || [];
  const benchTopHours = benchmark.top_hours || [];
  const hoursOverlap = myTopHours.filter(h => benchTopHours.includes(h)).length;
  const hoursBadge: ComparisonBadge = hoursOverlap >= 2 ? 'average' : hoursOverlap >= 1 ? 'average' : 'below';

  return (
    <Card className="border-border/50">
      <CardContent className="p-0">
        {/* Header - Always visible */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors rounded-lg"
        >
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <span className="font-medium text-sm">{t('benchmarks.title')}</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-xs">{t('benchmarks.tooltip')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Badge variant="secondary" className="text-xs font-normal">
              {getScopeLabel(scope_type, scope_code, t)} • {n_sites} {t('benchmarks.sites')}
            </Badge>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {/* Collapsible content */}
        {isExpanded && (
          <div className="px-4 pb-4 space-y-4">
            {/* 3 Benchmark metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* 1. Daily Revenue */}
              <div className="p-3 rounded-lg bg-muted/30 space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Euro className="h-4 w-4" />
                  <span className="text-xs font-medium">{t('benchmarks.metrics.dailyRevenue')}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-muted-foreground">{t('benchmarks.you')}:</span>
                    <span className="font-semibold">{formatCurrency(my_values.avg_daily_revenue)}</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-muted-foreground">{t('benchmarks.median')}:</span>
                    <span className="text-sm">{formatCurrency(benchmark.median_daily_revenue)}</span>
                  </div>
                </div>
                <div className="pt-1">
                  <ComparisonIndicator badge={revenueBadge} />
                </div>
              </div>

              {/* 2. CB/ESP Mix */}
              <div className="p-3 rounded-lg bg-muted/30 space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CreditCard className="h-4 w-4" />
                  <span className="text-xs font-medium">{t('benchmarks.metrics.paymentMix')}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-muted-foreground">{t('benchmarks.you')} CB:</span>
                    <span className="font-semibold">{formatPercent(my_values.cb_share)}</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-muted-foreground">{t('benchmarks.avgMarket')}:</span>
                    <span className="text-sm">{formatPercent(benchmark.avg_cb_share)}</span>
                  </div>
                </div>
                <div className="pt-1">
                  <ComparisonIndicator badge={cbBadge} />
                </div>
              </div>

              {/* 3. Peak Hours */}
              <div className="p-3 rounded-lg bg-muted/30 space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="text-xs font-medium">{t('benchmarks.metrics.peakHours')}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-muted-foreground">{t('benchmarks.you')}:</span>
                    <span className="font-semibold">
                      {myTopHours.length > 0 ? myTopHours.map(formatHour).join(', ') : '—'}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-muted-foreground">{t('benchmarks.typical')}:</span>
                    <span className="text-sm">
                      {benchTopHours.length > 0 ? benchTopHours.map(formatHour).join(', ') : '—'}
                    </span>
                  </div>
                </div>
                <div className="pt-1">
                  <ComparisonIndicator badge={hoursBadge} />
                </div>
              </div>
            </div>

            {/* Disclaimer */}
            <p className="text-xs text-muted-foreground text-center">
              {t('benchmarks.disclaimer')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
