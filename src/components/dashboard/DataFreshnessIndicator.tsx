import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentSite } from "@/hooks/useCurrentSite";
import { formatDistanceToNow, format, Locale } from "date-fns";
import { fr, enUS, de, es, it, nl } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { Clock, CheckCircle2, AlertTriangle, RefreshCw, Calendar, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const localeMap: Record<string, Locale> = {
  fr,
  en: enUS,
  de,
  es,
  it,
  nl,
};

interface DataFreshnessInfo {
  lastOperationDate: string | null;
  lastImportDate: string | null;
  totalOperations: number;
}

export function DataFreshnessIndicator() {
  const { t, i18n } = useTranslation(['app']);
  const { currentSiteId } = useCurrentSite();
  const locale = localeMap[i18n.language] || fr;

  const { data, isLoading } = useQuery({
    queryKey: ["dataFreshness", currentSiteId],
    queryFn: async (): Promise<DataFreshnessInfo> => {
      if (!currentSiteId) {
        return { lastOperationDate: null, lastImportDate: null, totalOperations: 0 };
      }

      // Get the most recent operation date
      const { data: latestOp, error: opError } = await supabase
        .from("operations")
        .select("operation_date, created_at")
        .eq("site_id", currentSiteId)
        .order("operation_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (opError) throw opError;

      // Get the last import batch
      const { data: lastBatch, error: batchError } = await supabase
        .from("import_batches")
        .select("created_at")
        .eq("site_id", currentSiteId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (batchError) throw batchError;

      // Get total count
      const { count } = await supabase
        .from("operations")
        .select("*", { count: "exact", head: true })
        .eq("site_id", currentSiteId);

      return {
        lastOperationDate: latestOp?.operation_date || null,
        lastImportDate: lastBatch?.created_at || latestOp?.created_at || null,
        totalOperations: count || 0,
      };
    },
    enabled: !!currentSiteId,
    staleTime: 60000, // 1 minute
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
        <RefreshCw className="h-3 w-3 animate-spin" />
        <span>{t('app:dashboard.freshness.loading')}</span>
      </div>
    );
  }

  if (!data.lastOperationDate) {
    return null;
  }

  // Calculate freshness status based on last operation date
  const lastOpDate = new Date(data.lastOperationDate);
  const now = new Date();
  const daysDiff = Math.floor((now.getTime() - lastOpDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Freshness status: green < 7 days, yellow 7-30 days, red > 30 days
  const isFresh = daysDiff <= 7;
  const isStale = daysDiff > 30;
  const status = isFresh ? "fresh" : isStale ? "stale" : "aging";

  const statusConfig = {
    fresh: {
      icon: CheckCircle2,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-950/30",
      borderColor: "border-green-200 dark:border-green-800",
    },
    aging: {
      icon: Clock,
      color: "text-yellow-600 dark:text-yellow-400",
      bgColor: "bg-yellow-50 dark:bg-yellow-950/30",
      borderColor: "border-yellow-200 dark:border-yellow-800",
    },
    stale: {
      icon: AlertTriangle,
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-50 dark:bg-red-950/30",
      borderColor: "border-red-200 dark:border-red-800",
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  const relativeTime = formatDistanceToNow(lastOpDate, { 
    addSuffix: true, 
    locale 
  });

  const formattedOpDate = format(lastOpDate, "dd MMMM yyyy", { locale });

  const formattedImportDate = data.lastImportDate 
    ? format(new Date(data.lastImportDate), "dd/MM/yyyy HH:mm", { locale })
    : null;

  const importRelativeTime = data.lastImportDate 
    ? formatDistanceToNow(new Date(data.lastImportDate), { addSuffix: true, locale })
    : null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className={cn(
              "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border cursor-help transition-colors",
              config.bgColor,
              config.borderColor,
              config.color
            )}
          >
            <Icon className="h-3 w-3 shrink-0" />
            <div className="flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3 opacity-70" />
                {t('app:dashboard.freshness.lastOperation')}: {relativeTime}
              </span>
              {formattedImportDate && (
                <>
                  <span className="text-muted-foreground hidden sm:inline">•</span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Upload className="h-3 w-3 opacity-70" />
                    <span className="hidden sm:inline">{t('app:dashboard.freshness.lastImport')}:</span>
                    {formattedImportDate}
                  </span>
                </>
              )}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1.5 text-sm">
            <p className="font-medium">
              {t('app:dashboard.freshness.details')}
            </p>
            <div className="space-y-1 text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">
                  {t('app:dashboard.freshness.lastOperation')}:
                </span>{" "}
                {formattedOpDate} ({relativeTime})
              </p>
              {importRelativeTime && formattedImportDate && (
                <p>
                  <span className="font-medium text-foreground">
                    {t('app:dashboard.freshness.lastImport')}:
                  </span>{" "}
                  {formattedImportDate}
                </p>
              )}
              <p>
                <span className="font-medium text-foreground">
                  {t('app:dashboard.freshness.totalOperations')}:
                </span>{" "}
                {data.totalOperations.toLocaleString()}
              </p>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}