import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDashboardProjects } from "@/hooks/dashboard-simulator/use-dashboard-projects";
import { PROJECTS_STRINGS } from "@/constants/dashboard-simulator/projects.strings";
import { OVERVIEW_STRINGS } from "@/constants/dashboard-simulator/projects.strings";
import { COMMON_STRINGS } from "@/constants/dashboard-simulator/common.strings";
import { StatusBadge } from "@/components/dashboard-simulator/shared/StatusBadge";
import {
  fillTemplate,
  formatEuro,
  formatMonths,
  timeAgoFr,
} from "@/components/dashboard-simulator/shared/format";
import type { DashboardStatusFilter } from "@/types/dashboard-simulator";

export function ProjectsPreviewList() {
  const [visible, setVisible] = useState(true);
  const [status, setStatus] = useState<DashboardStatusFilter>("all");
  const { data: projects, isLoading } = useDashboardProjects({ status });

  return (
    <Card className="shadow-form">
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 px-0 text-muted-foreground hover:bg-transparent"
            onClick={() => setVisible((v) => !v)}
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {visible ? OVERVIEW_STRINGS.hideProjects : OVERVIEW_STRINGS.showProjects}
          </Button>

          <Tabs value={status} onValueChange={(v) => setStatus(v as DashboardStatusFilter)}>
            <TabsList>
              <TabsTrigger value="all">{COMMON_STRINGS.filters.all}</TabsTrigger>
              <TabsTrigger value="validated">{COMMON_STRINGS.filters.validated}</TabsTrigger>
              <TabsTrigger value="in_progress">{COMMON_STRINGS.filters.inProgress}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {visible && (
          <div className="space-y-3">
            {isLoading || !projects
              ? Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-lg" />
                ))
              : projects.slice(0, 3).map((project) => (
                  <div
                    key={project.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 shadow-form"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium text-foreground">{project.name}</p>
                        <StatusBadge status={project.status} />
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {project.district} · {project.surface} m² · {project.zone}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        CA {formatEuro(project.kpis.estimatedRevenue)} · ROI{" "}
                        {formatMonths(project.kpis.roiMonths)} ·{" "}
                        {fillTemplate(PROJECTS_STRINGS.scenariosCount, {
                          count: project.scenarioCount,
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">
                        {fillTemplate(PROJECTS_STRINGS.updatedAgo, {
                          when: timeAgoFr(project.updatedAt),
                        })}
                      </span>
                      <Button asChild size="sm" variant="outline">
                        <Link to={`/dashboard-simulator/projects/${project.id}`}>
                          {COMMON_STRINGS.actions.open}
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
          </div>
        )}

        <Button asChild variant="ghost" size="sm" className="gap-2">
          <Link to="/dashboard-simulator/projects">
            {OVERVIEW_STRINGS.seeAllProjects}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
