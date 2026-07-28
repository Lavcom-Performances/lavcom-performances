import { MOCK_SCENARIOS } from "@/mocks/dashboard-simulator/mock-scenarios";
import type {
  DashboardQueryResult,
  DashboardScenario,
  DashboardSortBy,
  DashboardStatusFilter,
} from "@/types/dashboard-simulator";
import { useMockQuery } from "./use-mock-query";

export interface UseDashboardScenariosParams {
  projectId: string | undefined;
  search?: string;
  sortBy?: DashboardSortBy;
  status?: DashboardStatusFilter;
}

export function filterAndSortScenarios(
  scenarios: DashboardScenario[],
  { projectId, search = "", sortBy = "date", status = "all" }: UseDashboardScenariosParams,
): DashboardScenario[] {
  const term = search.trim().toLowerCase();

  return scenarios
    .filter((s) => s.projectId === projectId)
    .filter((s) => (status === "all" ? true : s.status === status))
    .filter((s) => (term.length === 0 ? true : s.name.toLowerCase().includes(term)))
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name, "fr");
      if (sortBy === "status") return a.status.localeCompare(b.status);
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
}

export function useDashboardScenarios(
  params: UseDashboardScenariosParams,
): DashboardQueryResult<DashboardScenario[]> {
  const { projectId, search = "", sortBy = "date", status = "all" } = params;

  return useMockQuery(
    () => filterAndSortScenarios(MOCK_SCENARIOS, { projectId, search, sortBy, status }),
    [projectId, search, sortBy, status],
    350,
  );
}

export function useDashboardScenario(
  projectId: string | undefined,
  scenarioId: string | undefined,
): DashboardQueryResult<DashboardScenario | null> {
  return useMockQuery(
    () =>
      MOCK_SCENARIOS.find((s) => s.projectId === projectId && s.id === scenarioId) ?? null,
    [projectId, scenarioId],
    300,
  );
}
