import { Link } from "react-router-dom";
import { GitCompare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/dashboard-simulator/shared/StatusBadge";
import { COMMON_STRINGS, KPI_STRINGS } from "@/constants/dashboard-simulator/common.strings";
import { SCENARIOS_STRINGS } from "@/constants/dashboard-simulator/scenarios.strings";
import { PROJECTS_STRINGS } from "@/constants/dashboard-simulator/projects.strings";
import {
  fillTemplate,
  formatEuro,
  formatMonths,
  formatSignedEuro,
  timeAgoFr,
} from "@/components/dashboard-simulator/shared/format";
import type { DashboardScenario } from "@/types/dashboard-simulator";
import { cn } from "@/lib/utils";

interface ScenarioCardProps {
  scenario: DashboardScenario;
  projectLocation: string;
  selected: boolean;
  onToggleSelect: (id: string) => void;
}

export function ScenarioCard({
  scenario,
  projectLocation,
  selected,
  onToggleSelect,
}: ScenarioCardProps) {
  return (
    <Card className={cn("shadow-form transition-colors", selected && "border-primary")}>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate font-semibold text-foreground">{scenario.name}</h3>
              <StatusBadge status={scenario.status} />
            </div>
            <p className="mt-1 truncate text-xs text-muted-foreground">{projectLocation}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {fillTemplate(PROJECTS_STRINGS.updatedAgo, { when: timeAgoFr(scenario.updatedAt) })}
            </p>
          </div>
          <Checkbox
            checked={selected}
            onCheckedChange={() => onToggleSelect(scenario.id)}
            aria-label={`${COMMON_STRINGS.actions.compare} ${scenario.name}`}
          />
        </div>

        <div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{scenario.progress} %</span>
            <span>
              {fillTemplate(SCENARIOS_STRINGS.stepLabel, {
                step: scenario.step,
                total: scenario.totalSteps,
              })}
            </span>
          </div>
          <Progress value={scenario.progress} className="mt-1 h-1.5" />
        </div>

        <dl className="grid grid-cols-2 gap-3 border-y py-3">
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {KPI_STRINGS.estimatedRevenue}
            </dt>
            <dd className="mt-0.5 text-sm font-semibold tabular-nums">
              {formatEuro(scenario.kpis.estimatedRevenue)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {KPI_STRINGS.monthlyResult}
            </dt>
            <dd className="mt-0.5 text-sm font-semibold tabular-nums">
              {formatSignedEuro(scenario.kpis.monthlyResult)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {KPI_STRINGS.breakEven}
            </dt>
            <dd className="mt-0.5 text-sm font-semibold tabular-nums">
              {formatEuro(scenario.kpis.breakEven)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {KPI_STRINGS.roi}
            </dt>
            <dd className="mt-0.5 text-sm font-semibold tabular-nums">
              {formatMonths(scenario.kpis.roiMonths)}
            </dd>
          </div>
        </dl>

        <div className="flex flex-wrap justify-end gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5"
            onClick={() => onToggleSelect(scenario.id)}
          >
            <GitCompare className="h-3.5 w-3.5" />
            {COMMON_STRINGS.actions.compare}
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link
              to={`/dashboard-simulator/projects/${scenario.projectId}/scenarios/${scenario.id}`}
            >
              {COMMON_STRINGS.actions.open}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
