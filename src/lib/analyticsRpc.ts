// Analytics RPC service functions for Supabase
import { supabase } from "@/integrations/supabase/client";

export async function fetchDashboardKpis(siteId: string, startDate: string, endDate: string) {
  const { data, error } = await supabase.rpc("rpc_dashboard_kpis", {
    p_site_id: siteId,
    p_start_date: startDate,
    p_end_date: endDate,
  });
  if (error) throw error;
  return data?.[0];
}

export async function fetchMonthlyRevenue(siteId: string, year: number) {
  const { data, error } = await supabase.rpc("rpc_monthly_revenue", {
    p_site_id: siteId,
    p_year: year,
  });
  if (error) throw error;
  return data ?? [];
}

export async function fetchRecommendations(siteId: string, startDate: string, endDate: string) {
  const { data, error } = await supabase.rpc("rpc_recommendations_v1", {
    p_site_id: siteId,
    p_start_date: startDate,
    p_end_date: endDate,
  });
  if (error) throw error;
  return data ?? [];
}
