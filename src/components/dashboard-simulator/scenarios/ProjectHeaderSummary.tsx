import { Link } from "react-router-dom";
import { ArrowLeft, Plus, GitCompare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/dashboard-simulator/shared/StatusBadge";
import { KpiTile } from "@/components/dashboard-simulator/shared/KpiTile";
import { COMMON_STRINGS, KPI_STRINGS } from "@/constants/dashboard-simulator/common.strings";
import { SCENARIOS_STRINGS } from "@/constants/dashboard-simulator/scenarios.strings";
import {
  fillTemplate,
  formatEuro,
  formatMonths,
  formatSignedEuro,
} from "@/components/dashboard-simulator/shared/format";
import type { DashboardProject } from "@/types/dashboard-simulator";

interface Props {
  project: DashboardProject;
  scenarioCount: number;
}

export function ProjectHeaderSummary({ project, scenarioCount }: Props) {
  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm" className="gap-2 px-0 hover:bg-transparent">
        <Link to="/dashboard-simulator/projects">
          <ArrowLeft className="h-4 w-4" />
          {SCENARIOS_STRINGS.backToProjects}
        </Link>
      </Button>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-foreground">{project.name}</h1>
            <StatusBadge status={project.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {project.district} · {project.surface} m² · {project.zone}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="gap-2">
            <Link to={`/dashboard-simulator/projects/${project.id}/scenario-comparator`}>
              <GitCompare className="h-4 w-4" />
              {SCENARIOS_STRINGS.compareTwo}
            </Link>
          </Button>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            {SCENARIOS_STRINGS.newScenario}
          </Button>
        </div>
      </div>

      <Card className="shadow-form">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm">
              <span className="font-semibold">{SCENARIOS_STRINGS.title}</span>{" "}
              <span className="text-xl font-bold tabular-nums">{scenarioCount}</span>{" "}
              <span className="text-muted-foreground">
                {fillTemplate(SCENARIOS_STRINGS.countLabel, { total: Math.max(scenarioCount, 5) })}
              </span>
            </p>
            {project.mainScenarioName && (
              <p className="text-sm text-muted-foreground">
                {fillTemplate(SCENARIOS_STRINGS.selectedScenario, {
                  name: project.mainScenarioName,
                })}
              </p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiTile
              label={KPI_STRINGS.estimatedRevenue}
              value={formatEuro(project.kpis.estimatedRevenue)}
            />
            <KpiTile
              label={KPI_STRINGS.monthlyResult}
              value={formatSignedEuro(project.kpis.monthlyResult)}
              tone={
                project.kpis.monthlyResult === null
                  ? "default"
                  : project.kpis.monthlyResult >= 0
                    ? "positive"
                    : "negative"
              }
            />
            <KpiTile label={KPI_STRINGS.breakEven} value={formatEuro(project.kpis.breakEven)} />
            <KpiTile label={KPI_STRINGS.roi} value={formatMonths(project.kpis.roiMonths)} />
          </div>

          <p className="text-xs text-muted-foreground">{COMMON_STRINGS.notAvailable === "–" ? "" : ""}</p>
        </CardContent>
      </Card>
    </div>
  );
}
