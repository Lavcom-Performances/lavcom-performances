import { MOCK_REPORTS } from "@/mocks/dashboard-simulator/mock-reports";
import type { DashboardQueryResult, DashboardReport } from "@/types/dashboard-simulator";
import { useMockQuery } from "./use-mock-query";

export interface UseDashboardReportsParams {
  search?: string;
  sortBy?: "date" | "name";
}

export function useDashboardReports(
  params: UseDashboardReportsParams = {},
): DashboardQueryResult<DashboardReport[]> {
  const { search = "", sortBy = "date" } = params;

  return useMockQuery(
    () => {
      const term = search.trim().toLowerCase();
      return MOCK_REPORTS.filter((r) =>
        term.length === 0 ? true : r.description.toLowerCase().includes(term),
      ).sort((a, b) =>
        sortBy === "name"
          ? a.description.localeCompare(b.description, "fr")
          : new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
    },
    [search, sortBy],
    350,
  );
}
