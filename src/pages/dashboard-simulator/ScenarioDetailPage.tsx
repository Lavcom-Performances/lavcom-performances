import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { DashboardBreadcrumb } from "@/components/dashboard-simulator/layout/DashboardBreadcrumb";
import { KpiTile } from "@/components/dashboard-simulator/shared/KpiTile";
import { StatusBadge } from "@/components/dashboard-simulator/shared/StatusBadge";
import { useDashboardProject } from "@/hooks/dashboard-simulator/use-dashboard-project";
import { useDashboardScenarios } from "@/hooks/dashboard-simulator/use-dashboard-scenarios";
import { COMMON_STRINGS, KPI_STRINGS } from "@/constants/dashboard-simulator/common.strings";
import { EDITOR_STRINGS, SCENARIOS_STRINGS } from "@/constants/dashboard-simulator/scenarios.strings";
import {
  fillTemplate,
  formatEuro,
  formatMonths,
  formatPercent,
  formatSignedEuro,
  timeAgoFr,
} from "@/components/dashboard-simulator/shared/format";

export default function ScenarioDetailPage() {
  const { projectId, scenarioId } = useParams<{ projectId: string; scenarioId: string }>();
  const { data: project, isLoading: projectLoading } = useDashboardProject(projectId);
  const { data: scenarios, isLoading } = useDashboardScenarios({ projectId });

  if (projectLoading || isLoading || !project || !scenarios) {
    return <Skeleton className="h-96 w-full rounded-lg" />;
  }

  const scenario = scenarios.find((s) => s.id === scenarioId);
  if (!scenario) {
    return (
      <Card className="shadow-form">
        <CardContent className="py-14 text-center text-muted-foreground">
          {SCENARIOS_STRINGS.noResultsTitle}
        </CardContent>
      </Card>
    );
  }

  const readOnlyFields: Array<[string, string]> = [
    [EDITOR_STRINGS.fields.projectName, project.name],
    [EDITOR_STRINGS.fields.country, project.country],
    [EDITOR_STRINGS.fields.address, project.address],
    [EDITOR_STRINGS.fields.city, project.city],
    [EDITOR_STRINGS.fields.postalCode, project.postalCode],
    [EDITOR_STRINGS.fields.zoneType, project.zoneType],
    [EDITOR_STRINGS.fields.openingHours, project.openingHours],
  ];

  return (
    <div className="space-y-6">
      <DashboardBreadcrumb
        items={[
          { label: COMMON_STRINGS.breadcrumb.simulator, to: "/dashboard-simulator" },
          { label: COMMON_STRINGS.breadcrumb.projects, to: "/dashboard-simulator/projects" },
          { label: project.name, to: `/dashboard-simulator/projects/${project.id}` },
          { label: scenario.name },
        ]}
      />

      <Button asChild variant="ghost" size="sm" className="gap-2 px-0 hover:bg-transparent">
        <Link to={`/dashboard-simulator/projects/${project.id}/scenarios`}>
          <ArrowLeft className="h-4 w-4" />
          {SCENARIOS_STRINGS.backToScenarios}
        </Link>
      </Button>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-foreground">{scenario.name}</h1>
            <StatusBadge status={scenario.status} />
            {scenario.isReference && <Badge variant="secondary">{SCENARIOS_STRINGS.reference}</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {fillTemplate(EDITOR_STRINGS.projectLabel, { name: project.name })} ·{" "}
            {fillTemplate(EDITOR_STRINGS.savedAgo, { when: timeAgoFr(scenario.updatedAt) })}
          </p>
        </div>
        <Button className="gap-2">
          <Save className="h-4 w-4" />
          {COMMON_STRINGS.actions.save}
        </Button>
      </div>

      <Card className="shadow-form">
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              {EDITOR_STRINGS.steps[Math.min(scenario.step, EDITOR_STRINGS.steps.length - 1)]}
            </span>
            <span className="text-muted-foreground">
              {fillTemplate(SCENARIOS_STRINGS.stepLabel, {
                step: scenario.step,
                total: scenario.totalSteps,
              })}
            </span>
          </div>
          <Progress value={scenario.progress} className="h-2" />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="shadow-form lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base">
              {EDITOR_STRINGS.steps[0]}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                ({EDITOR_STRINGS.readOnly})
              </span>
            </CardTitle>
            <Button asChild size="sm" variant="outline">
              <Link to={`/dashboard-simulator/projects/${project.id}`}>
                {EDITOR_STRINGS.editProjectInfo}
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {readOnlyFields.map(([label, value]) => (
              <div key={label} className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{label}</Label>
                <Input readOnly value={value} className="bg-muted/50 shadow-form" />
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="shadow-form">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{EDITOR_STRINGS.appliedScenario}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{EDITOR_STRINGS.appliedScenarioHint}</p>
              <div className="grid gap-3">
                <KpiTile
                  label={EDITOR_STRINGS.kpis.monthlyRevenue}
                  value={formatEuro(scenario.kpis.estimatedRevenue)}
                />
                <KpiTile
                  label={KPI_STRINGS.monthlyResult}
                  value={formatSignedEuro(scenario.kpis.monthlyResult)}
                  tone={
                    scenario.kpis.monthlyResult === null
                      ? "default"
                      : scenario.kpis.monthlyResult >= 0
                        ? "positive"
                        : "negative"
                  }
                />
                <KpiTile
                  label={EDITOR_STRINGS.kpis.payback}
                  value={formatMonths(scenario.kpis.roiMonths)}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-form">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{EDITOR_STRINGS.breakdownTitle}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{KPI_STRINGS.fixedCosts}</span>
                <span className="font-medium tabular-nums">
                  {formatEuro(scenario.kpis.fixedCosts)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{KPI_STRINGS.variableRate}</span>
                <span className="font-medium tabular-nums">
                  {formatPercent(scenario.kpis.variableRate)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{KPI_STRINGS.cyclesPerDay}</span>
                <span className="font-medium tabular-nums">
                  {scenario.kpis.cyclesPerDay ?? COMMON_STRINGS.notAvailable}
                </span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-muted-foreground">{KPI_STRINGS.breakEven}</span>
                <span className="font-semibold tabular-nums">
                  {formatEuro(scenario.kpis.breakEven)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
