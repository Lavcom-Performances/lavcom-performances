import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";

export interface DtsStatus {
  score: number;
  excluded_revenue_cents: number;
  top_flags: string[];
  actions_enabled: boolean;
}

export interface RecordEntry {
  label: string;
  date: string;
  revenue_cents: number;
}

export function useDtsStatus(siteId?: string | null) {
  const { organization } = useOrganization();
  const companyId = organization?.id;

  return useQuery({
    queryKey: ["dtsStatus", companyId, siteId],
    queryFn: async (): Promise<DtsStatus> => {
      if (!companyId) return { score: 100, excluded_revenue_cents: 0, top_flags: [], actions_enabled: true };

      // Fetch latest trust_day entries for this company (last 30 days)
      const { data, error } = await supabase
        .from("trust_day")
        .select("dts_score, excluded_revenue, top_flags")
        .eq("company_id", companyId)
        .order("day", { ascending: false })
        .limit(30);
      if (error || !data || data.length === 0) {
        return { score: 100, excluded_revenue_cents: 0, top_flags: [], actions_enabled: true };
      }

      const avgScore = Math.round(data.reduce((sum, d) => sum + (d.dts_score ?? 100), 0) / data.length);
      const totalExcluded = data.reduce((sum, d) => sum + (d.excluded_revenue ?? 0), 0);

      // Collect top flags
      const flagCounts = new Map<string, number>();
      data.forEach((d) => {
        const flags = (d.top_flags as string[]) ?? [];
        flags.forEach((f) => flagCounts.set(f, (flagCounts.get(f) ?? 0) + 1));
      });
      const topFlags = [...flagCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([f]) => f);

      return {
        score: avgScore,
        excluded_revenue_cents: Math.round(totalExcluded * 100),
        top_flags: topFlags,
        actions_enabled: avgScore >= 60,
      };
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRecords(siteId?: string | null) {
  return useQuery({
    queryKey: ["operatorRecords", siteId],
    queryFn: async (): Promise<RecordEntry[]> => {
      if (!siteId) return [];

      // Fetch daily analytics for this site, last 12 months
      const { data, error } = await supabase
        .from("analytics_daily")
        .select("date, revenue")
        .eq("site_id", siteId)
        .order("date", { ascending: false })
        .limit(365);

      if (error || !data || data.length === 0) return [];

      // Best day
      const bestDay = data.reduce((best, d) => 
        (Number(d.revenue) > Number(best.revenue)) ? d : best, data[0]);

      // Best month
      const monthlyAgg = new Map<string, number>();
      data.forEach((d) => {
        const month = d.date.substring(0, 7); // yyyy-MM
        monthlyAgg.set(month, (monthlyAgg.get(month) ?? 0) + Number(d.revenue));
      });
      let bestMonth = { month: "", revenue: 0 };
      monthlyAgg.forEach((rev, month) => {
        if (rev > bestMonth.revenue) bestMonth = { month, revenue: rev };
      });

      // Best weekend (Sat+Sun pair)
      const records: RecordEntry[] = [];
      
      if (bestDay) {
        records.push({
          label: "best_day",
          date: bestDay.date,
          revenue_cents: Math.round(Number(bestDay.revenue) * 100),
        });
      }
      
      if (bestMonth.month) {
        records.push({
          label: "best_month",
          date: bestMonth.month,
          revenue_cents: Math.round(bestMonth.revenue * 100),
        });
      }

      return records;
    },
    enabled: !!siteId,
    staleTime: 10 * 60 * 1000,
  });
}
