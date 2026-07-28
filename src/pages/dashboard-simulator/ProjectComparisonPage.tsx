import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
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
import { useDashboardProjects } from "@/hooks/dashboard-simulator/use-dashboard-projects";
import { COMMON_STRINGS } from "@/constants/dashboard-simulator/common.strings";
import { COMPARISON_STRINGS } from "@/constants/dashboard-simulator/comparison.strings";
import { formatEuro } from "@/components/dashboard-simulator/shared/format";

export default function ProjectComparisonPage() {
  const [params] = useSearchParams();
  const { data: projects, isLoading } = useDashboardProjects();

  const [a, b] = useMemo(() => {
    if (!projects) return [undefined, undefined];
    const first = projects.find((p) => p.id === params.get("a")) ?? projects[0];
    const second =
      projects.find((p) => p.id === params.get("b")) ?? projects.find((p) => p.id !== first?.id);
    return [first, second];
  }, [projects, params]);

  if (isLoading || !projects) {
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
          { label: COMMON_STRINGS.breadcrumb.comparator },
        ]}
      />

      <WelcomeHeader
        title={COMPARISON_STRINGS.projectTitle}
        subtitle={`${a.name} · ${b.name}`}
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
          subtitle={`${a.district} · ${a.surface} m² · ${a.zone}`}
          status={a.status}
          kpis={a.kpis}
          highlighted={better.id === a.id}
        />
        <ComparisonSideCard
          name={b.name}
          subtitle={`${b.district} · ${b.surface} m² · ${b.zone}`}
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
