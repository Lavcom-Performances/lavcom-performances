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
 * Calculates profitability metrics for a simulation project.
 * 
 * Computes monthly revenue from machines, aggregates fixed and variable costs,
 * determines break-even points (revenue and cycles per day), and evaluates
 * overall project profitability.
 * 
 * @param project - The simulation project to analyze. Can be partial or undefined,
 *                  in which case default/empty values are used for missing fields.
 * @returns An object containing all profitability results including revenue,
 *          costs, break-even points, estimated profit, and profitability status.
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
      (sum, machine) => sum + machine.count * machine.cyclesPerDay * machine.price * DAYS_PER_MONTH,
      0,
    );

  const totalCyclesMonth = machines.reduce(
    (sum, machine) => sum + machine.count * machine.cyclesPerDay * DAYS_PER_MONTH,
    0,
  );

  const avgRevenuePerCycle =
    totalCyclesMonth > 0 ? monthlyRevenue / totalCyclesMonth : 0;

  const fixedCostsTotal = fixedCosts.reduce((sum, cost) => sum + (cost.amount ?? 0), 0);
  const variableCostsPercent = variableCosts.reduce(
    (sum, cost) => sum + (cost.percent ?? 0),
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
