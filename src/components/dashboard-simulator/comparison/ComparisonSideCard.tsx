import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiTile } from "@/components/dashboard-simulator/shared/KpiTile";
import { StatusBadge } from "@/components/dashboard-simulator/shared/StatusBadge";
import { KPI_STRINGS } from "@/constants/dashboard-simulator/common.strings";
import {
  formatEuro,
  formatMonths,
  formatPercent,
  formatSignedEuro,
} from "@/components/dashboard-simulator/shared/format";
import type { DashboardKpiSet, DashboardStatus } from "@/types/dashboard-simulator";
import { cn } from "@/lib/utils";

interface ComparisonSideCardProps {
  name: string;
  subtitle: string;
  status: DashboardStatus;
  kpis: DashboardKpiSet;
  highlighted?: boolean;
}

export function ComparisonSideCard({
  name,
  subtitle,
  status,
  kpis,
  highlighted,
}: ComparisonSideCardProps) {
  return (
    <Card className={cn("shadow-form", highlighted && "border-primary")}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base">{name}</CardTitle>
          <StatusBadge status={status} />
        </div>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <KpiTile label={KPI_STRINGS.estimatedRevenue} value={formatEuro(kpis.estimatedRevenue)} />
        <KpiTile
          label={KPI_STRINGS.monthlyResult}
          value={formatSignedEuro(kpis.monthlyResult)}
          tone={
            kpis.monthlyResult === null ? "default" : kpis.monthlyResult >= 0 ? "positive" : "negative"
          }
        />
        <KpiTile label={KPI_STRINGS.breakEven} value={formatEuro(kpis.breakEven)} />
        <KpiTile label={KPI_STRINGS.roi} value={formatMonths(kpis.roiMonths)} />
        <KpiTile label={KPI_STRINGS.fixedCosts} value={formatEuro(kpis.fixedCosts)} />
        <KpiTile label={KPI_STRINGS.variableRate} value={formatPercent(kpis.variableRate)} />
      </CardContent>
    </Card>
  );
}
