import { MOCK_PROJECTS } from "@/mocks/dashboard-simulator/mock-projects";
import type {
  DashboardProject,
  DashboardQueryResult,
  DashboardSortBy,
  DashboardStatusFilter,
} from "@/types/dashboard-simulator";
import { useMockQuery } from "./use-mock-query";

export interface UseDashboardProjectsParams {
  search?: string;
  sortBy?: DashboardSortBy;
  status?: DashboardStatusFilter;
}

export function filterAndSortProjects(
  projects: DashboardProject[],
  { search = "", sortBy = "date", status = "all" }: UseDashboardProjectsParams,
): DashboardProject[] {
  const term = search.trim().toLowerCase();

  return projects
    .filter((p) => (status === "all" ? true : p.status === status))
    .filter((p) =>
      term.length === 0
        ? true
        : `${p.name} ${p.city} ${p.district} ${p.zone}`.toLowerCase().includes(term),
    )
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name, "fr");
      if (sortBy === "status") return a.status.localeCompare(b.status);
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
}

export function useDashboardProjects(
  params: UseDashboardProjectsParams = {},
): DashboardQueryResult<DashboardProject[]> {
  const { search = "", sortBy = "date", status = "all" } = params;

  return useMockQuery(
    () => filterAndSortProjects(MOCK_PROJECTS, { search, sortBy, status }),
    [search, sortBy, status],
    350,
  );
}
