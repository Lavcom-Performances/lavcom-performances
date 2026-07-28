import { MOCK_INVOICES } from "@/mocks/dashboard-simulator/mock-invoices";
import type { DashboardInvoice, DashboardQueryResult } from "@/types/dashboard-simulator";
import { useMockQuery } from "./use-mock-query";

export function useDashboardInvoices(
  params: { search?: string } = {},
): DashboardQueryResult<DashboardInvoice[]> {
  const { search = "" } = params;

  return useMockQuery(
    () => {
      const term = search.trim().toLowerCase();
      return MOCK_INVOICES.filter((i) =>
        term.length === 0 ? true : i.description.toLowerCase().includes(term),
      ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },
    [search],
    300,
  );
}
