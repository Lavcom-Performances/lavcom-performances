import { useQuery } from "@tanstack/react-query";
import { fetchDashboardKpis, fetchMonthlyRevenue, fetchMonthlyRevenueRange, fetchRecommendations, fetchDateBounds } from "@/lib/analyticsRpc";

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

export function useMonthlyRevenueRange(siteId: string, startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["monthlyRevenueRange", siteId, startDate, endDate],
    queryFn: () => fetchMonthlyRevenueRange(siteId, startDate, endDate),
    enabled: !!siteId && !!startDate && !!endDate,
  });
}

export function useRecommendations(siteId: string, startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["recs", siteId, startDate, endDate],
    queryFn: () => fetchRecommendations(siteId, startDate, endDate),
    enabled: !!siteId,
  });
}

export function useDateBounds(siteId: string) {
  return useQuery({
    queryKey: ["dateBounds", siteId],
    queryFn: () => fetchDateBounds(siteId),
    enabled: !!siteId,
  });
}
