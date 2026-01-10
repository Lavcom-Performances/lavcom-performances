import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { 
  Zap, 
  ArrowRight, 
  Target, 
  Wrench, 
  Megaphone, 
  TrendingUp,
  ChevronRight,
  AlertCircle,
  FileBarChart
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { generateBusinessActions, hasEnoughDataForActions } from "@/lib/businessActionsEngine";
import type { BusinessAction, BusinessActionsData, ActionCategory } from "@/types/businessActions";
import type { DashboardStats } from "@/hooks/useDashboardStats";

interface BusinessActionsSectionProps {
  stats: DashboardStats;
  isLoading?: boolean;
}

const categoryConfig: Record<ActionCategory, { icon: typeof Zap; colorClass: string }> = {
  revenue: { icon: TrendingUp, colorClass: "text-emerald-600 dark:text-emerald-400" },
  operations: { icon: Target, colorClass: "text-blue-600 dark:text-blue-400" },
  marketing: { icon: Megaphone, colorClass: "text-purple-600 dark:text-purple-400" },
  maintenance: { icon: Wrench, colorClass: "text-amber-600 dark:text-amber-400" },
};

const effortConfig = {
  low: { labelKey: "businessActions.effort.low", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  medium: { labelKey: "businessActions.effort.medium", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  high: { labelKey: "businessActions.effort.high", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

function ActionCard({ action, index }: { action: BusinessAction; index: number }) {
  const { t } = useTranslation("app");
  const navigate = useNavigate();
  const config = categoryConfig[action.category];
  const Icon = config.icon;
  const effort = effortConfig[action.effort];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
    >
      <Card className="h-full hover:shadow-md transition-shadow border-l-4 border-l-primary">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`p-1.5 rounded-md bg-muted ${config.colorClass}`}>
                <Icon className="h-4 w-4" />
              </div>
              <CardTitle className="text-sm font-semibold line-clamp-2">
                {action.title}
              </CardTitle>
            </div>
            <Badge variant="outline" className="shrink-0 text-xs">
              #{index + 1}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Description */}
          <p className="text-sm text-muted-foreground line-clamp-2">
            {action.description}
          </p>

          {/* Impact & Effort */}
          <div className="flex items-center justify-between gap-3 py-2 px-3 bg-muted/50 rounded-lg">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                {t("businessActions.impactLabel")}
              </span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                +{action.impactEstimate} €/mois
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                {t("businessActions.effortLabel")}
              </span>
              <Badge className={`${effort.className} text-xs border-0`}>
                {t(effort.labelKey)}
              </Badge>
            </div>
          </div>

          {/* KPI to track */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileBarChart className="h-3.5 w-3.5" />
            <span>{t("businessActions.kpiLabel")}: {action.kpiToTrack}</span>
          </div>

          {/* Steps preview */}
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              {t("businessActions.stepsLabel")}:
            </span>
            <ul className="space-y-1">
              {action.steps.slice(0, 3).map((step) => (
                <li key={step.step} className="flex items-start gap-2 text-xs text-foreground">
                  <span className="flex-shrink-0 w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-medium mt-0.5">
                    {step.step}
                  </span>
                  <span className="line-clamp-1">{step.description}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* View details link */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between text-primary hover:text-primary"
            onClick={() => navigate(`/recommendations?action=${action.id}`)}
          >
            {t("businessActions.viewDetails")}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function EmptyState() {
  const { t } = useTranslation("app");
  const navigate = useNavigate();

  return (
    <Card className="bg-muted/30 border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-8 text-center">
        <AlertCircle className="h-10 w-10 text-muted-foreground/50 mb-3" />
        <h3 className="font-medium text-foreground mb-1">
          {t("businessActions.empty.title")}
        </h3>
        <p className="text-sm text-muted-foreground max-w-md mb-4">
          {t("businessActions.empty.description")}
        </p>
        <Button variant="outline" size="sm" onClick={() => navigate("/operations")}>
          {t("businessActions.empty.cta")}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="h-full">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-md" />
              <Skeleton className="h-4 w-32" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-3 w-1/2" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function BusinessActionsSection({ stats, isLoading }: BusinessActionsSectionProps) {
  const { t } = useTranslation("app");

  // Transform stats to BusinessActionsData
  const actionsData = useMemo((): BusinessActionsData => {
    const cardPercentage = stats.totalRevenue > 0 
      ? (stats.revenueByCard / stats.totalRevenue) * 100 
      : 0;

    // Calculate morning (6-10h) and evening (17-21h) revenue from heatmap
    let morningRevenue = 0;
    let eveningRevenue = 0;
    
    if (stats.heatmapData && stats.heatmapData.length > 0) {
      const avgCycleValue = stats.totalTransactions > 0 
        ? stats.totalRevenue / stats.totalTransactions 
        : 5;
      
      stats.heatmapData.forEach(({ hour, cycles }) => {
        const revenue = cycles * avgCycleValue;
        if (hour >= 6 && hour < 10) morningRevenue += revenue;
        if (hour >= 17 && hour < 21) eveningRevenue += revenue;
      });
    }

    // Find best/worst days
    const weekdayPerformance = stats.weekdayData.map(d => ({ 
      day: d.day, 
      revenue: d.revenue 
    }));
    
    let bestDay: string | null = null;
    let worstDay: string | null = null;
    
    if (weekdayPerformance.length > 0) {
      const sorted = [...weekdayPerformance].sort((a, b) => b.revenue - a.revenue);
      bestDay = sorted[0]?.day || null;
      worstDay = sorted[sorted.length - 1]?.day || null;
    }

    // Find underperforming machines
    const underperformingMachines: { name: string; revenueGap: number }[] = [];
    
    if (stats.machinePerformance.length > 1) {
      const machinesByType = {
        washer: stats.machinePerformance.filter(m => m.type === "washer"),
        dryer: stats.machinePerformance.filter(m => m.type === "dryer"),
      };

      for (const [type, machines] of Object.entries(machinesByType)) {
        if (machines.length > 1) {
          const avgRevenue = machines.reduce((sum, m) => sum + m.revenue, 0) / machines.length;
          machines.forEach(m => {
            if (m.revenue < avgRevenue * 0.5) {
              underperformingMachines.push({
                name: m.name,
                revenueGap: avgRevenue - m.revenue,
              });
            }
          });
        }
      }
    }

    // Count data points (unique days)
    const dataPoints = stats.dailyData?.length || 0;

    return {
      totalRevenue: stats.totalRevenue,
      revenueByCard: stats.revenueByCard,
      revenueByCash: stats.revenueByCash,
      cardPercentage,
      totalTransactions: stats.totalTransactions,
      averageBasket: stats.averageBasket,
      peakHour: null, // Would need hourly data
      morningRevenue,
      eveningRevenue,
      weekdayPerformance,
      bestDay,
      worstDay,
      machineCount: stats.machinePerformance.length,
      underperformingMachines: underperformingMachines.sort((a, b) => b.revenueGap - a.revenueGap),
      dataPoints,
      hasEnoughData: hasEnoughDataForActions(dataPoints),
    };
  }, [stats]);

  // Generate actions
  const actions = useMemo(() => {
    return generateBusinessActions(actionsData, (key) => t(key));
  }, [actionsData, t]);

  if (isLoading) {
    return (
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-display font-semibold">{t("businessActions.title")}</h2>
        </div>
        <LoadingSkeleton />
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-display font-semibold">{t("businessActions.title")}</h2>
          <Badge variant="secondary" className="text-xs">Top 3</Badge>
        </div>
        {actions.length > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-primary"
            onClick={() => window.location.href = "/recommendations"}
          >
            {t("businessActions.seeAll")}
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>

      {actions.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {actions.map((action, index) => (
            <ActionCard key={action.id} action={action} index={index} />
          ))}
        </div>
      )}
    </section>
  );
}
