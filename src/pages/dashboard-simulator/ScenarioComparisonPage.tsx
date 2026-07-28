import { useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardBreadcrumb } from "@/components/dashboard-simulator/layout/DashboardBreadcrumb";
import { WelcomeHeader } from "@/components/dashboard-simulator/layout/WelcomeHeader";
import { ComparisonSideCard } from "@/components/dashboard-simulator/comparison/ComparisonSideCard";
import { ComparisonDeltaCard } from "@/components/dashboard-simulator/comparison/ComparisonDeltaCard";
import { ComparisonRadarCard } from "@/components/dashboard-simulator/comparison/ComparisonRadarCard";
import { ComparisonRoiCard } from "@/components/dashboard-simulator/comparison/ComparisonRoiCard";
import { ComparisonSynthesisCard } from "@/components/dashboard-simulator/comparison/ComparisonSynthesisCard";
import { useDashboardProject } from "@/hooks/dashboard-simulator/use-dashboard-project";
import { useDashboardScenarios } from "@/hooks/dashboard-simulator/use-dashboard-scenarios";
import { COMMON_STRINGS } from "@/constants/dashboard-simulator/common.strings";
import { COMPARISON_STRINGS } from "@/constants/dashboard-simulator/comparison.strings";
import { formatEuro } from "@/components/dashboard-simulator/shared/format";

export default function ScenarioComparisonPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [params] = useSearchParams();
  const { data: project, isLoading: projectLoading } = useDashboardProject(projectId);
  const { data: scenarios, isLoading } = useDashboardScenarios({ projectId });

  const [a, b] = useMemo(() => {
    if (!scenarios) return [undefined, undefined];
    const first = scenarios.find((s) => s.id === params.get("a")) ?? scenarios[0];
    const second =
      scenarios.find((s) => s.id === params.get("b")) ?? scenarios.find((s) => s.id !== first?.id);
    return [first, second];
  }, [scenarios, params]);

  if (projectLoading || isLoading || !project) {
    return <Skeleton className="h-96 w-full rounded-lg" />;
  }

  if (!a || !b) {
    return (
      <Card className="shadow-form">
        <CardContent className="py-14 text-center text-muted-foreground">
          {COMPARISON_STRINGS.pickTwo}
        </CardContent>
      </Card>
    );
  }

  const better = (a.kpis.monthlyResult ?? 0) >= (b.kpis.monthlyResult ?? 0) ? a : b;
  const gap = Math.abs((a.kpis.monthlyResult ?? 0) - (b.kpis.monthlyResult ?? 0));

  return (
    <div className="space-y-6">
      <DashboardBreadcrumb
        items={[
          { label: COMMON_STRINGS.breadcrumb.simulator, to: "/dashboard-simulator" },
          { label: COMMON_STRINGS.breadcrumb.projects, to: "/dashboard-simulator/projects" },
          { label: project.name, to: `/dashboard-simulator/projects/${project.id}` },
          { label: COMMON_STRINGS.breadcrumb.scenarioComparison },
        ]}
      />

      <WelcomeHeader
        title={COMPARISON_STRINGS.scenarioTitle}
        subtitle={project.name}
        actions={
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            {COMPARISON_STRINGS.download}
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <ComparisonSideCard
          name={a.name}
          subtitle={project.name}
          status={a.status}
          kpis={a.kpis}
          highlighted={better.id === a.id}
        />
        <ComparisonSideCard
          name={b.name}
          subtitle={project.name}
          status={b.status}
          kpis={b.kpis}
          highlighted={better.id === b.id}
        />
      </div>

      <ComparisonDeltaCard nameA={a.name} nameB={b.name} kpisA={a.kpis} kpisB={b.kpis} />

      <div className="grid gap-6 lg:grid-cols-2">
        <ComparisonRadarCard nameA={a.name} nameB={b.name} kpisA={a.kpis} kpisB={b.kpis} />
        <ComparisonRoiCard nameA={a.name} nameB={b.name} kpisA={a.kpis} kpisB={b.kpis} />
      </div>

      <ComparisonSynthesisCard
        points={[
          `${better.name} dégage ${formatEuro(gap)} de résultat mensuel de plus.`,
          `Seuil de rentabilité : ${formatEuro(a.kpis.breakEven)} (${a.name}) contre ${formatEuro(b.kpis.breakEven)} (${b.name}).`,
        ]}
      />
    </div>
  );
}
