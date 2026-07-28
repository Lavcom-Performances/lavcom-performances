import { Link } from "react-router-dom";
import { Copy, GitCompare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/dashboard-simulator/shared/StatusBadge";
import { COMMON_STRINGS, KPI_STRINGS } from "@/constants/dashboard-simulator/common.strings";
import { PROJECTS_STRINGS } from "@/constants/dashboard-simulator/projects.strings";
import {
  fillTemplate,
  formatEuro,
  formatSignedEuro,
  timeAgoFr,
} from "@/components/dashboard-simulator/shared/format";
import type { DashboardProject } from "@/types/dashboard-simulator";
import { cn } from "@/lib/utils";

interface ProjectCardProps {
  project: DashboardProject;
  selected: boolean;
  onToggleSelect: (id: string) => void;
}

export function ProjectCard({ project, selected, onToggleSelect }: ProjectCardProps) {
  const result = project.kpis.monthlyResult;

  return (
    <Card className={cn("shadow-form transition-colors", selected && "border-primary")}>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate font-semibold text-foreground">{project.name}</h3>
              <StatusBadge status={project.status} />
            </div>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {project.district} · {project.surface} m² · {project.zone}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {fillTemplate(PROJECTS_STRINGS.updatedAgo, { when: timeAgoFr(project.updatedAt) })}
            </p>
          </div>
          <Checkbox
            checked={selected}
            onCheckedChange={() => onToggleSelect(project.id)}
            aria-label={`${COMMON_STRINGS.actions.compare} ${project.name}`}
          />
        </div>

        <dl className="grid grid-cols-3 gap-3 border-y py-3">
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {KPI_STRINGS.estimatedRevenue}
            </dt>
            <dd className="mt-0.5 text-sm font-semibold tabular-nums">
              {formatEuro(project.kpis.estimatedRevenue)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {KPI_STRINGS.monthlyResult}
            </dt>
            <dd
              className={cn(
                "mt-0.5 text-sm font-semibold tabular-nums",
                result !== null && result >= 0 && "text-primary",
                result !== null && result < 0 && "text-destructive",
              )}
            >
              {formatSignedEuro(result)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {KPI_STRINGS.breakEven}
            </dt>
            <dd className="mt-0.5 text-sm font-semibold tabular-nums">
              {formatEuro(project.kpis.breakEven)}
            </dd>
          </div>
        </dl>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link
            to={`/dashboard-simulator/projects/${project.id}/scenarios`}
            className="text-xs font-medium text-primary hover:underline"
          >
            {project.scenarioCount === 1
              ? PROJECTS_STRINGS.scenarioCountOne
              : fillTemplate(PROJECTS_STRINGS.scenariosCount, { count: project.scenarioCount })}
          </Link>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="gap-1.5"
              onClick={() => onToggleSelect(project.id)}
            >
              <GitCompare className="h-3.5 w-3.5" />
              {COMMON_STRINGS.actions.compare}
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to={`/dashboard-simulator/projects/${project.id}`}>
                {COMMON_STRINGS.actions.open}
              </Link>
            </Button>
            <Button size="sm" variant="ghost" className="gap-1.5">
              <Copy className="h-3.5 w-3.5" />
              {COMMON_STRINGS.actions.duplicate}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
