import { Skeleton } from "@/components/ui/skeleton";
import { ProjectCard } from "./ProjectCard";
import { ProjectsEmptyState } from "./ProjectsEmptyState";
import type { DashboardProject } from "@/types/dashboard-simulator";

interface ProjectsGridProps {
  projects: DashboardProject[] | undefined;
  isLoading: boolean;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  filtered: boolean;
}

export function ProjectsGrid({
  projects,
  isLoading,
  selectedIds,
  onToggleSelect,
  filtered,
}: ProjectsGridProps) {
  if (isLoading || !projects) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-60 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (projects.length === 0) {
    return <ProjectsEmptyState filtered={filtered} />;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          selected={selectedIds.includes(project.id)}
          onToggleSelect={onToggleSelect}
        />
      ))}
    </div>
  );
}
