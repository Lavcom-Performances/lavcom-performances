import { Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { KpiTile } from "@/components/dashboard-simulator/shared/KpiTile";
import { KPI_STRINGS } from "@/constants/dashboard-simulator/common.strings";
import { SCENARIOS_STRINGS } from "@/constants/dashboard-simulator/scenarios.strings";
import {
  formatEuro,
  formatMonths,
  formatSignedEuro,
} from "@/components/dashboard-simulator/shared/format";
import type { DashboardScenario } from "@/types/dashboard-simulator";

export function ScenarioReferenceCard({ scenario }: { scenario: DashboardScenario }) {
  return (
    <Card className="border-primary/40 shadow-form">
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-primary">{SCENARIOS_STRINGS.reference}</p>
          <span className="text-sm text-muted-foreground">· {scenario.name}</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiTile
            label={KPI_STRINGS.estimatedRevenue}
            value={formatEuro(scenario.kpis.estimatedRevenue)}
          />
          <KpiTile
            label={KPI_STRINGS.monthlyResult}
            value={formatSignedEuro(scenario.kpis.monthlyResult)}
            tone="positive"
          />
          <KpiTile label={KPI_STRINGS.breakEven} value={formatEuro(scenario.kpis.breakEven)} />
          <KpiTile label={KPI_STRINGS.roi} value={formatMonths(scenario.kpis.roiMonths)} />
        </div>
      </CardContent>
    </Card>
  );
}
