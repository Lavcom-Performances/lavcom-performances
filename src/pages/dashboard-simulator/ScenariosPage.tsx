import { useState } from "react";
import { useParams } from "react-router-dom";
import { DashboardBreadcrumb } from "@/components/dashboard-simulator/layout/DashboardBreadcrumb";
import { ProjectHeaderSummary } from "@/components/dashboard-simulator/scenarios/ProjectHeaderSummary";
import { ScenarioReferenceCard } from "@/components/dashboard-simulator/scenarios/ScenarioReferenceCard";
import { ScenariosToolbar } from "@/components/dashboard-simulator/scenarios/ScenariosToolbar";
import { ScenariosGrid } from "@/components/dashboard-simulator/scenarios/ScenariosGrid";
import { ProjectCompareBar } from "@/components/dashboard-simulator/projects/ProjectCompareBar";
import { useDashboardProject } from "@/hooks/dashboard-simulator/use-dashboard-project";
import { useDashboardScenarios } from "@/hooks/dashboard-simulator/use-dashboard-scenarios";
import { COMMON_STRINGS } from "@/constants/dashboard-simulator/common.strings";
import { SCENARIOS_STRINGS } from "@/constants/dashboard-simulator/scenarios.strings";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardSortBy, DashboardStatusFilter } from "@/types/dashboard-simulator";

export default function ScenariosPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<DashboardStatusFilter>("all");
  const [sortBy, setSortBy] = useState<DashboardSortBy>("date");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: project, isLoading: projectLoading } = useDashboardProject(projectId);
  const { data: scenarios, isLoading } = useDashboardScenarios({
    projectId,
    search,
    sortBy,
    status,
  });

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id].slice(-2),
    );

  if (projectLoading || !project) {
    return <Skeleton className="h-96 w-full rounded-lg" />;
  }

  const reference = scenarios?.find((s) => s.name === project.mainScenarioName) ?? scenarios?.[0];
  const projectLocation = `${project.district} · ${project.surface} m² · ${project.zone}`;

  return (
    <div className="space-y-6">
      <DashboardBreadcrumb
        items={[
          { label: COMMON_STRINGS.breadcrumb.simulator, to: "/dashboard-simulator" },
          { label: COMMON_STRINGS.breadcrumb.projects, to: "/dashboard-simulator/projects" },
          { label: project.name },
          { label: COMMON_STRINGS.breadcrumb.scenarios },
        ]}
      />

      <ProjectHeaderSummary project={project} scenarioCount={scenarios?.length ?? 0} />

      {reference && <ScenarioReferenceCard scenario={reference} />}

      <ScenariosToolbar
        search={search}
        onSearchChange={setSearch}
        status={status}
        onStatusChange={setStatus}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        searchPlaceholder={SCENARIOS_STRINGS.searchPlaceholder}
      />

      <ScenariosGrid
        scenarios={scenarios}
        isLoading={isLoading}
        projectLocation={projectLocation}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        filtered={search.trim().length > 0 || status !== "all"}
      />

      <ProjectCompareBar
        selectedIds={selectedIds}
        onClear={() => setSelectedIds([])}
        compareTo={`/dashboard-simulator/projects/${project.id}/scenario-comparator`}
      />
    </div>
  );
}
