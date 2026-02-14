import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Euro, TrendingUp, Percent, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardStats } from "@/hooks/useDashboardStats";
import type { KpiObjective } from "@/hooks/useKpiObjectives";

interface OperatorHealthKPIsProps {
  stats: DashboardStats;
  globalObjective?: KpiObjective;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

interface HealthCardProps {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  deltaPrev?: number | null;
  deltaObj?: number | null;
  helper: string;
  variant?: "default" | "primary" | "success" | "warning";
}

function HealthCard({ title, value, icon: Icon, deltaPrev, deltaObj, helper, variant = "default" }: HealthCardProps) {
  const formatDelta = (d: number | null | undefined) => {
    if (d === null || d === undefined) return null;
    const sign = d > 0 ? "+" : "";
    return `${sign}${Math.abs(d) >= 10 ? Math.round(d) : d.toFixed(1)}%`;
  };

  return (
    <motion.div variants={itemVariants}>
      <div className={cn(
        "bg-card border rounded-lg p-4 h-[160px] flex flex-col transition-all hover:shadow-md",
        variant === "primary" && "border-primary/30 bg-primary/5",
        variant === "warning" && "border-amber-300/50 bg-amber-50/50 dark:bg-amber-950/10",
      )}>
        <div className="flex items-center gap-2 mb-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">{title}</span>
        </div>
        
        <p className="text-2xl font-bold text-foreground tabular-nums mb-2">{value}</p>
        
        <div className="flex gap-3 mt-auto">
          {deltaPrev !== null && deltaPrev !== undefined && (
            <div className="flex items-center gap-1">
              <TrendingUp className={cn("h-3 w-3", deltaPrev >= 0 ? "text-emerald-600" : "text-red-500")} />
              <span className={cn("text-xs font-semibold tabular-nums", deltaPrev >= 0 ? "text-emerald-600" : "text-red-500")}>
                {formatDelta(deltaPrev)}
              </span>
              <span className="text-[10px] text-muted-foreground">vs préc.</span>
            </div>
          )}
          {deltaObj !== null && deltaObj !== undefined && (
            <div className="flex items-center gap-1">
              <span className={cn("text-xs font-semibold tabular-nums", deltaObj >= 0 ? "text-emerald-600" : "text-amber-600")}>
                {formatDelta(deltaObj)}
              </span>
              <span className="text-[10px] text-muted-foreground">vs obj.</span>
            </div>
          )}
        </div>
        
        <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1">{helper}</p>
      </div>
    </motion.div>
  );
}

export function OperatorHealthKPIs({ stats, globalObjective }: OperatorHealthKPIsProps) {
  const { t } = useTranslation("app");
  
  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M €`;
    if (value >= 10000) return `${(value / 1000).toFixed(0)}K €`;
    return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(value)) + " €";
  };

  const objectiveCents = globalObjective?.objective_amount_cents ?? null;
  const objectiveEuros = objectiveCents ? objectiveCents / 100 : null;
  
  const deltaVsObj = objectiveEuros 
    ? ((stats.totalRevenue - objectiveEuros) / objectiveEuros) * 100 
    : null;

  return (
    <motion.div
      className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <HealthCard
        title={t("operatorDashboard.health.revenue", { defaultValue: "Chiffre d'affaires" })}
        value={formatCurrency(stats.totalRevenue)}
        icon={Euro}
        deltaPrev={stats.revenueTrend !== 0 ? stats.revenueTrend : null}
        deltaObj={deltaVsObj}
        helper={t("operatorDashboard.health.revenueHelper", { defaultValue: "Comparé à la période précédente et à votre objectif mensuel." })}
        variant="primary"
      />
      <HealthCard
        title={t("operatorDashboard.health.margin", { defaultValue: "Résultat estimé" })}
        value="—"
        icon={TrendingUp}
        deltaPrev={null}
        deltaObj={null}
        helper={t("operatorDashboard.health.marginHelper", { defaultValue: "Disponible après configuration des charges." })}
      />
      <HealthCard
        title={t("operatorDashboard.health.occupancy", { defaultValue: "Occupation" })}
        value="—"
        icon={Percent}
        deltaPrev={null}
        deltaObj={null}
        helper={t("operatorDashboard.health.occupancyHelper", { defaultValue: "Identifie vos périodes chargées et calmes pour optimiser." })}
      />
      <HealthCard
        title={t("operatorDashboard.health.issues", { defaultValue: "Anomalies" })}
        value="0"
        icon={AlertTriangle}
        deltaPrev={null}
        deltaObj={null}
        helper={t("operatorDashboard.health.issuesHelper", { defaultValue: "Imports échoués et anomalies détectées." })}
        variant="default"
      />
    </motion.div>
  );
}
