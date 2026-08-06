import type { SimulationProject } from "@/types/simulator.types";

const DAYS_PER_MONTH = 30;

export interface ProfitabilityResults {
  monthlyRevenue: number;
  fixedCostsTotal: number;
  variableCostsPercent: number;
  variableCostsTotal: number;
  breakEvenRevenueMonthly: number | null;
  breakEvenCyclesPerDay: number | null;
  estimatedProfitMonth: number;
  isProfitable: boolean;
}

/**
 * Computes the profitability indicators of a simulator project.
 * Pure function, no React dependency.
 */
export function calculateProfitability(
  project: Partial<SimulationProject> | undefined,
): ProfitabilityResults {
  const machines = project?.machines ?? [];
  const fixedCosts = project?.fixedCosts ?? [];
  const variableCosts = project?.variableCosts ?? [];

  const monthlyRevenue =
    project?.totalRevenue ??
    machines.reduce(
      (sum, m) => sum + m.count * m.cyclesPerDay * m.price * DAYS_PER_MONTH,
      0,
    );

  const totalCyclesMonth = machines.reduce(
    (sum, m) => sum + m.count * m.cyclesPerDay * DAYS_PER_MONTH,
    0,
  );

  const avgRevenuePerCycle =
    totalCyclesMonth > 0 ? monthlyRevenue / totalCyclesMonth : 0;

  const fixedCostsTotal = fixedCosts.reduce((sum, c) => sum + (c.amount ?? 0), 0);
  const variableCostsPercent = variableCosts.reduce(
    (sum, c) => sum + (c.percent ?? 0),
    0,
  );
  const variableCostsTotal = monthlyRevenue * (variableCostsPercent / 100);

  const breakEvenRevenueMonthly =
    variableCostsPercent < 100
      ? fixedCostsTotal / (1 - variableCostsPercent / 100)
      : null;

  const breakEvenCyclesPerDay =
    breakEvenRevenueMonthly !== null && avgRevenuePerCycle > 0
      ? breakEvenRevenueMonthly / avgRevenuePerCycle / DAYS_PER_MONTH
      : null;

  const estimatedProfitMonth = monthlyRevenue - variableCostsTotal - fixedCostsTotal;

  return {
    monthlyRevenue,
    fixedCostsTotal,
    variableCostsPercent,
    variableCostsTotal,
    breakEvenRevenueMonthly,
    breakEvenCyclesPerDay,
    estimatedProfitMonth,
    isProfitable: estimatedProfitMonth > 0,
  };
}
