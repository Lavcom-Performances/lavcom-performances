import { useMemo } from "react";
import { useSiteCosts } from "@/hooks/useSiteCosts";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useCurrentSite } from "@/hooks/useCurrentSite";
import { DateRange } from "react-day-picker";
import { differenceInDays } from "date-fns";

export interface ProfitabilityMetrics {
  // Revenue
  totalRevenue: number;
  monthlyRevenue: number;
  
  // Costs
  totalFixedCosts: number;
  totalVariableCosts: number;
  totalCosts: number;
  
  // Profit
  grossProfit: number;
  netProfit: number;
  profitMargin: number;
  
  // Per transaction metrics
  revenuePerTransaction: number;
  costPerTransaction: number;
  profitPerTransaction: number;
  
  // Breakdown
  costsBreakdown: {
    label: string;
    value: number;
    percentage: number;
    type: "fixed" | "variable";
  }[];
  
  // Status
  isLoading: boolean;
  hasCosts: boolean;
  hasData: boolean;
}

export function useProfitability(dateRange?: DateRange) {
  const { currentSiteId } = useCurrentSite();
  const { costs, hasCosts, isLoading: costsLoading } = useSiteCosts(currentSiteId);
  const { stats, isLoading: statsLoading, isEmpty } = useDashboardStats(dateRange, currentSiteId || undefined);

  const metrics = useMemo((): ProfitabilityMetrics => {
    // Calculate period in months (for prorating fixed costs)
    let periodMonths = 1;
    if (dateRange?.from && dateRange?.to) {
      const days = differenceInDays(dateRange.to, dateRange.from) + 1;
      periodMonths = Math.max(1, days / 30);
    }

    const totalRevenue = stats.totalRevenue;
    const monthlyRevenue = totalRevenue / periodMonths;

    // Fixed costs (prorated by period)
    const fixedRent = (costs.fixed_rent || 0) * periodMonths;
    const fixedLease = (costs.fixed_lease || 0) * periodMonths;
    const fixedSubscriptions = (costs.fixed_subscriptions || 0) * periodMonths;
    const fixedInsurance = (costs.fixed_insurance || 0) * periodMonths;
    const fixedCleaning = (costs.fixed_cleaning || 0) * periodMonths;
    const fixedOther = (costs.fixed_other || 0) * periodMonths;

    const totalFixedCosts = fixedRent + fixedLease + fixedSubscriptions + fixedInsurance + fixedCleaning + fixedOther;

    // Variable costs (percentage of revenue)
    const energyWaterCost = totalRevenue * ((costs.var_energy_water_percent || 0) / 100);
    const detergentCost = totalRevenue * ((costs.var_detergent_percent || 0) / 100);
    const totalVariableCosts = energyWaterCost + detergentCost;

    const totalCosts = totalFixedCosts + totalVariableCosts;

    // Profit calculations
    const grossProfit = totalRevenue - totalVariableCosts;
    const netProfit = totalRevenue - totalCosts;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Per transaction metrics
    const txCount = stats.totalTransactions || 1;
    const revenuePerTransaction = totalRevenue / txCount;
    const costPerTransaction = totalCosts / txCount;
    const profitPerTransaction = netProfit / txCount;

    // Costs breakdown
    const allCosts = [
      { label: "Loyer", value: fixedRent, type: "fixed" as const },
      { label: "Crédit-bail", value: fixedLease, type: "fixed" as const },
      { label: "Abonnements", value: fixedSubscriptions, type: "fixed" as const },
      { label: "Assurance", value: fixedInsurance, type: "fixed" as const },
      { label: "Nettoyage", value: fixedCleaning, type: "fixed" as const },
      { label: "Autres charges", value: fixedOther, type: "fixed" as const },
      { label: "Énergie & eau", value: energyWaterCost, type: "variable" as const },
      { label: "Lessive", value: detergentCost, type: "variable" as const },
    ].filter(c => c.value > 0);

    const costsBreakdown = allCosts.map(c => ({
      ...c,
      percentage: totalCosts > 0 ? (c.value / totalCosts) * 100 : 0,
    }));

    return {
      totalRevenue,
      monthlyRevenue,
      totalFixedCosts,
      totalVariableCosts,
      totalCosts,
      grossProfit,
      netProfit,
      profitMargin,
      revenuePerTransaction,
      costPerTransaction,
      profitPerTransaction,
      costsBreakdown,
      isLoading: costsLoading || statsLoading,
      hasCosts,
      hasData: !isEmpty,
    };
  }, [costs, stats, dateRange, hasCosts, costsLoading, statsLoading, isEmpty]);

  return metrics;
}
