import { MOCK_PROJECTS } from "@/mocks/dashboard-simulator/mock-projects";
import type { DashboardProject, DashboardQueryResult } from "@/types/dashboard-simulator";
import { useMockQuery } from "./use-mock-query";

export function useDashboardProject(
  projectId: string | undefined,
): DashboardQueryResult<DashboardProject | null> {
  return useMockQuery(
    () => MOCK_PROJECTS.find((p) => p.id === projectId) ?? null,
    [projectId],
    300,
  );
}
