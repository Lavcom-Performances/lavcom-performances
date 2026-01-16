import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentSite } from "@/hooks/useCurrentSite";
import { useAuth } from "@/hooks/useAuth";
import { DateRange } from "react-day-picker";

export interface DataQualityInfo {
  // Basic info
  lastImportDate: string | null;
  lastOperationDate: string | null;
  provider: string | null;
  
  // Period stats
  periodStart: string | null;
  periodEnd: string | null;
  operationsCount: number;
  totalRevenue: number;
  
  // Anomaly detection
  minHour: number | null;
  maxHour: number | null;
  distinctDays: number;
  periodDays: number;
  
  // Warnings
  warnings: DataQualityWarning[];
}

export interface DataQualityWarning {
  type: 'missing_hours' | 'empty_kpis' | 'sparse_days';
  severity: 'warning' | 'error';
  message: string;
  details: string;
}

interface UseDataQualityOptions {
  dateRange?: DateRange;
  enabled?: boolean;
}

export function useDataQuality(options: UseDataQualityOptions = {}) {
  const { currentSiteId } = useCurrentSite();
  const { user } = useAuth();
  const { dateRange, enabled = true } = options;

  return useQuery({
    queryKey: ["dataQuality", currentSiteId, dateRange?.from?.toISOString(), dateRange?.to?.toISOString()],
    queryFn: async (): Promise<DataQualityInfo> => {
      if (!currentSiteId || !user) {
        return getEmptyResult();
      }

      const dateFrom = dateRange?.from?.toISOString().split('T')[0];
      const dateTo = dateRange?.to?.toISOString().split('T')[0];

      // Parallel queries for efficiency
      const [
        lastImportResult,
        lastOperationResult,
        periodStatsResult,
        hourRangeResult,
        distinctDaysResult,
      ] = await Promise.all([
        // Last import
        supabase
          .from("import_batches")
          .select("created_at, filename")
          .eq("site_id", currentSiteId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        
        // Last operation
        supabase
          .from("operations")
          .select("operation_date")
          .eq("site_id", currentSiteId)
          .order("operation_date", { ascending: false })
          .limit(1)
          .maybeSingle(),
        
        // Period stats (count + revenue) - filtered by date range if provided
        getPeriodStats(currentSiteId, dateFrom, dateTo),
        
        // Hour range (min/max hours)
        getHourRange(currentSiteId, dateFrom, dateTo),
        
        // Distinct days count
        getDistinctDays(currentSiteId, dateFrom, dateTo),
      ]);

      // Detect provider from filename
      const filename = lastImportResult.data?.filename || '';
      const provider = detectProvider(filename);

      // Calculate period span in days
      const periodDays = dateFrom && dateTo
        ? Math.ceil((new Date(dateTo).getTime() - new Date(dateFrom).getTime()) / (1000 * 60 * 60 * 24)) + 1
        : 0;

      // Build warnings
      const warnings = buildWarnings({
        minHour: hourRangeResult.minHour,
        maxHour: hourRangeResult.maxHour,
        operationsCount: periodStatsResult.count,
        totalRevenue: periodStatsResult.revenue,
        distinctDays: distinctDaysResult,
        periodDays,
      });

      // Log warnings to system_events if any
      if (warnings.length > 0) {
        logWarningsToSystemEvents(currentSiteId, warnings);
      }

      return {
        lastImportDate: lastImportResult.data?.created_at || null,
        lastOperationDate: lastOperationResult.data?.operation_date || null,
        provider,
        periodStart: periodStatsResult.minDate,
        periodEnd: periodStatsResult.maxDate,
        operationsCount: periodStatsResult.count,
        totalRevenue: periodStatsResult.revenue,
        minHour: hourRangeResult.minHour,
        maxHour: hourRangeResult.maxHour,
        distinctDays: distinctDaysResult,
        periodDays,
        warnings,
      };
    },
    enabled: enabled && !!currentSiteId && !!user,
    staleTime: 60000, // 1 minute
  });
}

function getEmptyResult(): DataQualityInfo {
  return {
    lastImportDate: null,
    lastOperationDate: null,
    provider: null,
    periodStart: null,
    periodEnd: null,
    operationsCount: 0,
    totalRevenue: 0,
    minHour: null,
    maxHour: null,
    distinctDays: 0,
    periodDays: 0,
    warnings: [],
  };
}

function detectProvider(filename: string): string | null {
  const lower = filename.toLowerCase();
  if (lower.includes('lmcontrol') || lower.includes('lm_control') || lower.includes('lm-control')) {
    return 'LM Control';
  }
  if (lower.includes('wiline') || lower.includes('wi-line') || lower.includes('wi_line')) {
    return 'WiLine';
  }
  if (lower.includes('nayax')) {
    return 'Nayax';
  }
  // Generic CSV
  if (lower.endsWith('.csv')) {
    return 'CSV';
  }
  return null;
}

async function getPeriodStats(siteId: string, dateFrom?: string, dateTo?: string) {
  let query = supabase
    .from("operations")
    .select("amount, operation_date")
    .eq("site_id", siteId);

  if (dateFrom) {
    query = query.gte("operation_date", dateFrom);
  }
  if (dateTo) {
    query = query.lte("operation_date", dateTo);
  }

  const { data, error } = await query;

  if (error || !data) {
    return { count: 0, revenue: 0, minDate: null, maxDate: null };
  }

  const revenue = data.reduce((sum, op) => {
    const amount = Number(op.amount) || 0;
    return sum + amount;
  }, 0);

  const dates = data.map(op => op.operation_date).filter(Boolean).sort();

  return {
    count: data.length,
    revenue,
    minDate: dates[0] || null,
    maxDate: dates[dates.length - 1] || null,
  };
}

async function getHourRange(siteId: string, dateFrom?: string, dateTo?: string) {
  let query = supabase
    .from("operations")
    .select("operation_time")
    .eq("site_id", siteId)
    .not("operation_time", "is", null);

  if (dateFrom) {
    query = query.gte("operation_date", dateFrom);
  }
  if (dateTo) {
    query = query.lte("operation_date", dateTo);
  }

  const { data, error } = await query;

  if (error || !data || data.length === 0) {
    return { minHour: null, maxHour: null };
  }

  const hours = data
    .map(op => {
      if (!op.operation_time) return null;
      const hour = parseInt(op.operation_time.split(':')[0], 10);
      return isNaN(hour) ? null : hour;
    })
    .filter((h): h is number => h !== null);

  if (hours.length === 0) {
    return { minHour: null, maxHour: null };
  }

  return {
    minHour: Math.min(...hours),
    maxHour: Math.max(...hours),
  };
}

async function getDistinctDays(siteId: string, dateFrom?: string, dateTo?: string): Promise<number> {
  let query = supabase
    .from("operations")
    .select("operation_date")
    .eq("site_id", siteId);

  if (dateFrom) {
    query = query.gte("operation_date", dateFrom);
  }
  if (dateTo) {
    query = query.lte("operation_date", dateTo);
  }

  const { data, error } = await query;

  if (error || !data) {
    return 0;
  }

  const uniqueDays = new Set(data.map(op => op.operation_date));
  return uniqueDays.size;
}

interface WarningInput {
  minHour: number | null;
  maxHour: number | null;
  operationsCount: number;
  totalRevenue: number;
  distinctDays: number;
  periodDays: number;
}

function buildWarnings(input: WarningInput): DataQualityWarning[] {
  const warnings: DataQualityWarning[] = [];

  // A) Missing morning hours
  if (input.minHour !== null && input.minHour >= 10 && input.operationsCount > 10) {
    warnings.push({
      type: 'missing_hours',
      severity: 'warning',
      message: 'Aucune donnée avant 10h',
      details: `Première opération à ${input.minHour}h. Vérifiez le parsing des heures ou les données du provider.`,
    });
  }

  // B) Empty KPIs (operations exist but revenue = 0)
  if (input.operationsCount > 0 && input.totalRevenue === 0) {
    warnings.push({
      type: 'empty_kpis',
      severity: 'error',
      message: 'CA = 0€ malgré des opérations',
      details: `${input.operationsCount} opération(s) trouvée(s) mais aucun chiffre d'affaires. Vérifiez les types d'opérations ou le champ montant.`,
    });
  }

  // C) Sparse days (less than 50% coverage for periods > 30 days)
  if (input.periodDays > 30 && input.distinctDays > 0) {
    const coverage = (input.distinctDays / input.periodDays) * 100;
    if (coverage < 50) {
      warnings.push({
        type: 'sparse_days',
        severity: 'warning',
        message: 'Couverture partielle de la période',
        details: `Seulement ${input.distinctDays} jour(s) avec données sur ${input.periodDays} jours (${coverage.toFixed(0)}%). Données manquantes ou imports incomplets.`,
      });
    }
  }

  return warnings;
}

async function logWarningsToSystemEvents(siteId: string, warnings: DataQualityWarning[]) {
  try {
    // Only log one event per batch to avoid spam
    const warningsSummary = warnings.map(w => `${w.type}: ${w.message}`).join('; ');
    
    await supabase.rpc('rpc_log_system_event', {
      p_source: 'data-quality-check',
      p_severity: warnings.some(w => w.severity === 'error') ? 'error' : 'warning',
      p_message: `Data quality issues detected for site ${siteId}`,
      p_code: 'DATA_QUALITY_WARNING',
      p_env: import.meta.env.MODE || 'production',
      p_meta: { site_id: siteId, warnings: warnings.map(w => ({ type: w.type, message: w.message })) },
    });
  } catch (e) {
    // Silent fail - don't block the main flow
    console.warn('Failed to log data quality warning:', e);
  }
}
