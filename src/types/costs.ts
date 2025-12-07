// Types pour le module Charges / Seuil de rentabilité

export interface FixedCosts {
  fixed_rent: number;           // Loyer + charges
  fixed_lease: number;          // Prêt / leasing machines
  fixed_subscriptions: number;  // Abonnements (centrale, internet, alarmes, etc.)
  fixed_insurance: number;      // Assurances
  fixed_cleaning: number;       // Ménage / entretien
  fixed_other: number;          // Autres charges fixes diverses
}

export interface VariableCosts {
  var_energy_water_percent: number;  // % du CA pour électricité + eau
  var_detergent_percent: number;     // % du CA pour lessive / produits
}

export interface LaundryCosts extends FixedCosts, VariableCosts {}

// Interface pour les données de rentabilité calculées
export interface ProfitabilityMetrics {
  fixed_costs_total: number;
  var_total_percent: number;
  avg_revenue_per_cycle: number;
  break_even_revenue_monthly: number | null;
  break_even_cycles_month: number | null;
  break_even_cycles_day: number | null;
  estimated_variable_costs: number;
  estimated_profit_month: number;
}

// Fonctions de calcul

export function calculateFixedCostsTotal(costs: FixedCosts): number {
  return (
    (costs.fixed_rent || 0) +
    (costs.fixed_lease || 0) +
    (costs.fixed_subscriptions || 0) +
    (costs.fixed_insurance || 0) +
    (costs.fixed_cleaning || 0) +
    (costs.fixed_other || 0)
  );
}

export function calculateVarTotalPercent(costs: VariableCosts): number {
  return (costs.var_energy_water_percent || 0) + (costs.var_detergent_percent || 0);
}

export function calculateProfitabilityMetrics(
  costs: LaundryCosts,
  siteTurnoverMonth: number,
  siteTotalCyclesMonth: number
): ProfitabilityMetrics {
  const fixed_costs_total = calculateFixedCostsTotal(costs);
  const var_total_percent = calculateVarTotalPercent(costs);
  
  // CA moyen par cycle
  const avg_revenue_per_cycle = siteTotalCyclesMonth > 0
    ? siteTurnoverMonth / siteTotalCyclesMonth
    : 0;
  
  // Seuil de rentabilité (CA mensuel)
  const break_even_revenue_monthly = var_total_percent < 100
    ? fixed_costs_total / (1 - var_total_percent / 100)
    : null;
  
  // Cycles nécessaires par mois
  const break_even_cycles_month = 
    avg_revenue_per_cycle > 0 && break_even_revenue_monthly !== null
      ? break_even_revenue_monthly / avg_revenue_per_cycle
      : null;
  
  // Cycles nécessaires par jour
  const break_even_cycles_day = break_even_cycles_month !== null
    ? break_even_cycles_month / 30
    : null;
  
  // Charges variables estimées
  const estimated_variable_costs = siteTurnoverMonth * (var_total_percent / 100);
  
  // Résultat estimé (bénéfice ou perte)
  const estimated_profit_month = siteTurnoverMonth - estimated_variable_costs - fixed_costs_total;
  
  return {
    fixed_costs_total,
    var_total_percent,
    avg_revenue_per_cycle,
    break_even_revenue_monthly,
    break_even_cycles_month,
    break_even_cycles_day,
    estimated_variable_costs,
    estimated_profit_month
  };
}

// Vérifie si les charges sont renseignées
export function hasCostsData(costs: LaundryCosts): boolean {
  return calculateFixedCostsTotal(costs) > 0 || calculateVarTotalPercent(costs) > 0;
}
