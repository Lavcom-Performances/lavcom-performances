import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { 
  Zap, ArrowRight, Target, Wrench, Megaphone, TrendingUp,
  AlertCircle, ShieldAlert, ChevronRight, FileBarChart
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { generateBusinessActions, hasEnoughDataForActions } from "@/lib/businessActionsEngine";
import type { BusinessAction, BusinessActionsData, ActionCategory } from "@/types/businessActions";
import type { DashboardStats } from "@/hooks/useDashboardStats";
import type { DtsStatus } from "@/hooks/useOperatorDashboard";
import type { KpiObjective } from "@/hooks/useKpiObjectives";

interface OperatorTopActionsProps {
  stats: DashboardStats;
  dts: DtsStatus;
  globalObjective?: KpiObjective;
  isLoading?: boolean;
}

const categoryConfig: Record<ActionCategory, { icon: typeof Zap; colorClass: string }> = {
  revenue: { icon: TrendingUp, colorClass: "text-emerald-600 dark:text-emerald-400" },
  operations: { icon: Target, colorClass: "text-blue-600 dark:text-blue-400" },
  marketing: { icon: Megaphone, colorClass: "text-purple-600 dark:text-purple-400" },
  maintenance: { icon: Wrench, colorClass: "text-amber-600 dark:text-amber-400" },
};

const effortLabels: Record<string, string> = {
  low: "Faible",
  medium: "Moyen",
  high: "Élevé",
};

function ActionCard({ action, index }: { action: BusinessAction; index: number }) {
  const navigate = useNavigate();
  const config = categoryConfig[action.category];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.25 }}
    >
      <Card className="h-full hover:shadow-md transition-shadow border-l-4 border-l-primary">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`p-1.5 rounded-md bg-muted ${config.colorClass}`}>
                <Icon className="h-4 w-4" />
              </div>
              <CardTitle className="text-sm font-semibold line-clamp-2">{action.title}</CardTitle>
            </div>
            <Badge variant="outline" className="shrink-0 text-xs">#{index + 1}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground line-clamp-2">{action.description}</p>

          <div className="flex items-center justify-between gap-3 py-2 px-3 bg-muted/50 rounded-lg">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Impact</span>
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">+{action.impactEstimate} €/mois</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Effort</span>
              <Badge className="text-xs border-0 bg-muted">{effortLabels[action.effort] ?? action.effort}</Badge>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileBarChart className="h-3.5 w-3.5" />
            <span>KPI : {action.kpiToTrack}</span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between text-primary hover:text-primary"
            onClick={() => navigate(`/recommendations?action=${action.id}`)}
          >
            Voir les détails
            <ChevronRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function OperatorTopActions({ stats, dts, globalObjective, isLoading }: OperatorTopActionsProps) {
  const { t } = useTranslation("app");
  const navigate = useNavigate();

  // Build actions data from stats (same as BusinessActionsSection)
  const actionsData = useMemo((): BusinessActionsData => {
    const cardPercentage = stats.totalRevenue > 0 ? (stats.revenueByCard / stats.totalRevenue) * 100 : 0;
    let morningRevenue = 0, eveningRevenue = 0;
    if (stats.heatmapData?.length > 0) {
      const avgCycleValue = stats.totalTransactions > 0 ? stats.totalRevenue / stats.totalTransactions : 5;
      stats.heatmapData.forEach(({ hour, cycles }) => {
        const revenue = cycles * avgCycleValue;
        if (hour >= 6 && hour < 10) morningRevenue += revenue;
        if (hour >= 17 && hour < 21) eveningRevenue += revenue;
      });
    }
    const weekdayPerformance = stats.weekdayData.map(d => ({ day: d.day, revenue: d.revenue }));
    let bestDay: string | null = null, worstDay: string | null = null;
    if (weekdayPerformance.length > 0) {
      const sorted = [...weekdayPerformance].sort((a, b) => b.revenue - a.revenue);
      bestDay = sorted[0]?.day ?? null;
      worstDay = sorted[sorted.length - 1]?.day ?? null;
    }
    const underperformingMachines: { name: string; revenueGap: number }[] = [];
    if (stats.machinePerformance.length > 1) {
      const byType = { washer: stats.machinePerformance.filter(m => m.type === "washer"), dryer: stats.machinePerformance.filter(m => m.type === "dryer") };
      for (const machines of Object.values(byType)) {
        if (machines.length > 1) {
          const avg = machines.reduce((s, m) => s + m.revenue, 0) / machines.length;
          machines.forEach(m => { if (m.revenue < avg * 0.5) underperformingMachines.push({ name: m.name, revenueGap: avg - m.revenue }); });
        }
      }
    }
    return {
      totalRevenue: stats.totalRevenue, revenueByCard: stats.revenueByCard, revenueByCash: stats.revenueByCash,
      cardPercentage, totalTransactions: stats.totalTransactions, averageBasket: stats.averageBasket,
      peakHour: null, morningRevenue, eveningRevenue, weekdayPerformance, bestDay, worstDay,
      machineCount: stats.machinePerformance.length,
      underperformingMachines: underperformingMachines.sort((a, b) => b.revenueGap - a.revenueGap),
      dataPoints: stats.dailyData?.length || 0,
      hasEnoughData: hasEnoughDataForActions(stats.dailyData?.length || 0),
    };
  }, [stats]);

  const actions = useMemo(() => generateBusinessActions(actionsData, (key) => t(key)), [actionsData, t]);

  // DTS gate
  if (!dts.actions_enabled) {
    return (
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-display font-semibold">
            {t("operatorDashboard.actions.title", { defaultValue: "Focus de la semaine" })}
          </h2>
          <Badge variant="secondary" className="text-xs">Top 3</Badge>
        </div>
        <Card className="bg-amber-50/50 dark:bg-amber-950/10 border-amber-200 dark:border-amber-800">
          <CardContent className="flex items-start gap-3 py-5">
            <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-foreground font-medium">
                {t("operatorDashboard.actions.disabled", { 
                  defaultValue: "Les actions sont temporairement suspendues car la fiabilité des données est trop basse (DTS < 60). Vous pouvez toujours consulter vos KPIs et corriger les problèmes de données." 
                })}
              </p>
              <Button variant="link" className="p-0 h-auto text-sm mt-2" onClick={() => navigate("/platform/data-trust-score")}>
                {t("operatorDashboard.actions.seeDts", { defaultValue: "Voir la fiabilité des données" })}
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    );
  }

  if (actions.length === 0) {
    return (
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-display font-semibold">
            {t("operatorDashboard.actions.title", { defaultValue: "Focus de la semaine" })}
          </h2>
        </div>
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <h3 className="font-medium mb-1">{t("businessActions.empty.title")}</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-4">{t("businessActions.empty.description")}</p>
            <Button variant="outline" size="sm" onClick={() => navigate("/operations")}>
              {t("businessActions.empty.cta")} <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-display font-semibold">
            {t("operatorDashboard.actions.title", { defaultValue: "Focus de la semaine" })}
          </h2>
          <Badge variant="secondary" className="text-xs">Top 3</Badge>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {actions.map((action, i) => (
          <ActionCard key={action.id} action={action} index={i} />
        ))}
      </div>
    </section>
  );
}
