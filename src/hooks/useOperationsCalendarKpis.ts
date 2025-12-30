import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CalendarKpis {
  day: { revenue_total: number; revenue_cb: number; revenue_esp: number };
  month: { revenue_total: number; revenue_cb: number; revenue_esp: number };
  year: { revenue_total: number; revenue_cb: number; revenue_esp: number };
}

async function fetchOperationsCalendarKpis(siteId: string): Promise<CalendarKpis> {
  const { data, error } = await supabase.rpc("rpc_operations_calendar_kpis", {
    p_site_id: siteId,
  });
  
  if (error) throw error;

  const defaultRow = { revenue_total: 0, revenue_cb: 0, revenue_esp: 0 };
  const byPeriod = Object.fromEntries(
    (data ?? []).map((r: any) => [r.period, r])
  );
  
  return {
    day: byPeriod.day ?? defaultRow,
    month: byPeriod.month ?? defaultRow,
    year: byPeriod.year ?? defaultRow,
  };
}

export function useOperationsCalendarKpis(siteId: string | undefined) {
  return useQuery({
    queryKey: ["operationsCalendarKpis", siteId],
    queryFn: () => fetchOperationsCalendarKpis(siteId!),
    enabled: !!siteId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
