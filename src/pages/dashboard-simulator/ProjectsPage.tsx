import { useState } from "react";
import { Link } from "react-router-dom";
import { GitCompare, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WelcomeHeader } from "@/components/dashboard-simulator/layout/WelcomeHeader";
import { DashboardBreadcrumb } from "@/components/dashboard-simulator/layout/DashboardBreadcrumb";
import { ProjectsToolbar } from "@/components/dashboard-simulator/projects/ProjectsToolbar";
import { ProjectsGrid } from "@/components/dashboard-simulator/projects/ProjectsGrid";
import { ProjectCompareBar } from "@/components/dashboard-simulator/projects/ProjectCompareBar";
import { PackExpiryBanner } from "@/components/dashboard-simulator/projects/PackExpiryBanner";
import { useDashboardProjects } from "@/hooks/dashboard-simulator/use-dashboard-projects";
import { useDashboardPack } from "@/hooks/dashboard-simulator/use-dashboard-pack";
import { PROJECTS_STRINGS } from "@/constants/dashboard-simulator/projects.strings";
import { COMMON_STRINGS } from "@/constants/dashboard-simulator/common.strings";
import { fillTemplate } from "@/components/dashboard-simulator/shared/format";
import type { DashboardSortBy, DashboardStatusFilter } from "@/types/dashboard-simulator";

export default function ProjectsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<DashboardStatusFilter>("all");
  const [sortBy, setSortBy] = useState<DashboardSortBy>("date");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: projects, isLoading } = useDashboardProjects({ search, sortBy, status });
  const { data: pack } = useDashboardPack();

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id].slice(-2),
    );

  return (
    <div className="space-y-6">
      <DashboardBreadcrumb
        items={[
          { label: COMMON_STRINGS.breadcrumb.simulator, to: "/dashboard-simulator" },
          { label: COMMON_STRINGS.breadcrumb.projects },
        ]}
      />

      <WelcomeHeader
        title={PROJECTS_STRINGS.pageTitle}
        subtitle={PROJECTS_STRINGS.pageSubtitle}
        actions={
          <>
            {pack && (
              <span className="rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground">
                {fillTemplate(PROJECTS_STRINGS.projectsUsed, {
                  used: pack.usedProjects,
                  total: pack.totalProjects,
                })}
              </span>
            )}
            <Button asChild variant="outline" className="gap-2">
              <Link to="/dashboard-simulator/projects/comparator">
                <GitCompare className="h-4 w-4" />
                {PROJECTS_STRINGS.compareTwo}
              </Link>
            </Button>
            <Button asChild className="gap-2">
              <Link to="/simulator/project">
                <Plus className="h-4 w-4" />
                {PROJECTS_STRINGS.newProject}
              </Link>
            </Button>
          </>
        }
      />

      <PackExpiryBanner />

      <ProjectsToolbar
        search={search}
        onSearchChange={setSearch}
        status={status}
        onStatusChange={setStatus}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        searchPlaceholder={PROJECTS_STRINGS.searchPlaceholder}
      />

      <ProjectsGrid
        projects={projects}
        isLoading={isLoading}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        filtered={search.trim().length > 0 || status !== "all"}
      />

      <ProjectCompareBar
        selectedIds={selectedIds}
        onClear={() => setSelectedIds([])}
        compareTo="/dashboard-simulator/projects/comparator"
      />
    </div>
  );
}
