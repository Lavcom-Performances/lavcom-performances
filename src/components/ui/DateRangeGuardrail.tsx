/**
 * DateRangeGuardrail.tsx
 * 
 * Warning component for large date ranges (>90 days)
 * Shows friendly warning with option to narrow range or force load (admin only)
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Calendar, ChevronDown, Lock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DangerZoneDialog } from "@/components/ui/danger-zone-dialog";
import { calculateDateRangeDays, PERFORMANCE_THRESHOLDS } from "@/lib/performanceMonitor";
import { subDays, startOfMonth, subMonths, format } from "date-fns";
import { DateRange } from "react-day-picker";

interface DateRangeGuardrailProps {
  dateRange?: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  onForceLoad?: () => void;
  isPlatformAdmin?: boolean;
  className?: string;
}

export function DateRangeGuardrail({
  dateRange,
  onDateRangeChange,
  onForceLoad,
  isPlatformAdmin = false,
  className = "",
}: DateRangeGuardrailProps) {
  const { t } = useTranslation(['app', 'common']);
  const [showForceDialog, setShowForceDialog] = useState(false);
  
  const days = calculateDateRangeDays(dateRange?.from, dateRange?.to);
  const threshold = PERFORMANCE_THRESHOLDS.DATE_RANGE_GUARDRAIL_DAYS;
  
  // Don't show if within guardrail
  if (days <= threshold) return null;
  
  // Quick date range options
  const quickRanges = [
    {
      label: t('app:dateRange.last30Days', 'Derniers 30 jours'),
      range: {
        from: subDays(new Date(), 30),
        to: new Date(),
      },
    },
    {
      label: t('app:dateRange.last90Days', 'Derniers 90 jours'),
      range: {
        from: subDays(new Date(), 90),
        to: new Date(),
      },
    },
    {
      label: t('app:dateRange.thisMonth', 'Ce mois-ci'),
      range: {
        from: startOfMonth(new Date()),
        to: new Date(),
      },
    },
    {
      label: t('app:dateRange.lastMonth', 'Mois dernier'),
      range: {
        from: startOfMonth(subMonths(new Date(), 1)),
        to: subDays(startOfMonth(new Date()), 1),
      },
    },
  ];

  const handleForceConfirm = () => {
    setShowForceDialog(false);
    onForceLoad?.();
  };

  return (
    <>
      <Alert variant="default" className={`border-amber-500/50 bg-amber-500/10 ${className}`}>
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <AlertTitle className="text-amber-700 dark:text-amber-400">
          {t('app:performance.largeRangeWarning', 'Période étendue détectée')}
        </AlertTitle>
        <AlertDescription className="text-amber-600 dark:text-amber-300">
          <p className="mb-3">
            {t('app:performance.largeRangeDesc', {
              days,
              threshold,
              defaultValue: `Vous consultez ${days} jours de données. Pour de meilleures performances, nous recommandons de réduire à ${threshold} jours ou moins.`,
            })}
          </p>
          
          <div className="flex flex-wrap gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Calendar className="h-4 w-4" />
                  {t('app:performance.narrowRange', 'Réduire la période')}
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {quickRanges.map((option, i) => (
                  <DropdownMenuItem
                    key={i}
                    onClick={() => onDateRangeChange(option.range)}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {isPlatformAdmin && onForceLoad && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-amber-600 hover:text-amber-700"
                onClick={() => setShowForceDialog(true)}
              >
                <Lock className="h-4 w-4" />
                {t('app:performance.forceLoad', 'Charger quand même (Admin)')}
              </Button>
            )}
          </div>
        </AlertDescription>
      </Alert>

      {/* Force load confirmation dialog for admins */}
      <DangerZoneDialog
        open={showForceDialog}
        onOpenChange={setShowForceDialog}
        title={t('app:performance.forceLoadTitle', 'Charger une large période ?')}
        description={t('app:performance.forceLoadDesc', {
          days,
          defaultValue: `Vous êtes sur le point de charger ${days} jours de données. Cela peut ralentir significativement l'application et augmenter la charge serveur.`,
        })}
        confirmText="CHARGER"
        onConfirm={handleForceConfirm}
      />
    </>
  );
}
