import { useQuery } from "@tanstack/react-query";
import { fetchDashboardKpis, fetchMonthlyRevenue, fetchRecommendations } from "@/lib/analyticsRpc";

export function useDashboardKpis(siteId: string, startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["dashboardKpis", siteId, startDate, endDate],
    queryFn: () => fetchDashboardKpis(siteId, startDate, endDate),
    enabled: !!siteId,
  });
}

export function useMonthlyRevenue(siteId: string, year: number) {
  return useQuery({
    queryKey: ["monthlyRevenue", siteId, year],
    queryFn: () => fetchMonthlyRevenue(siteId, year),
    enabled: !!siteId,
  });
}

export function useRecommendations(siteId: string, startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["recs", siteId, startDate, endDate],
    queryFn: () => fetchRecommendations(siteId, startDate, endDate),
    enabled: !!siteId,
  });
}
