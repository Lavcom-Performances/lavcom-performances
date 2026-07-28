import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardProjects } from "@/hooks/dashboard-simulator/use-dashboard-projects";
import { OVERVIEW_STRINGS } from "@/constants/dashboard-simulator/projects.strings";
import { KpiTile } from "@/components/dashboard-simulator/shared/KpiTile";

export function ProjectsStatsCard() {
  const { data: projects, isLoading } = useDashboardProjects();

  if (isLoading || !projects) {
    return <Skeleton className="h-40 w-full rounded-lg" />;
  }

  const validated = projects.filter((p) => p.status === "validated").length;
  const inProgress = projects.filter((p) => p.status === "in_progress").length;
  const scenarios = projects.reduce((sum, p) => sum + p.scenarioCount, 0);

  return (
    <Card className="shadow-form">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{OVERVIEW_STRINGS.statsTitle}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-3">
        <KpiTile label={OVERVIEW_STRINGS.validatedProjects} value={validated} tone="positive" />
        <KpiTile label={OVERVIEW_STRINGS.inProgressProjects} value={inProgress} />
        <KpiTile label={OVERVIEW_STRINGS.scenariosCreated} value={scenarios} />
      </CardContent>
    </Card>
  );
}
