// Types pour le module Simulation (Futurs exploitants)

import { FixedCosts, VariableCosts, calculateFixedCostsTotal, calculateVarTotalPercent } from './costs';

// Configuration des machines
export interface WashingMachineConfig {
  wash_7kg_count: number;
  wash_7kg_price: number;
  wash_7kg_cycles_day: number;
  wash_10kg_count: number;
  wash_10kg_price: number;
  wash_10kg_cycles_day: number;
  wash_18kg_count: number;
  wash_18kg_price: number;
  wash_18kg_cycles_day: number;
}

export interface DryerConfig {
  dry_small_count: number;
  dry_small_price: number;
  dry_small_cycles_day: number;
  dry_large_count: number;
  dry_large_price: number;
  dry_large_cycles_day: number;
}

// Projet de simulation complet
export interface SimulationProject {
  id?: string;
  name: string;
  location: string;
  surface_m2: number;
  opening_hours_description: string;
  
  // Machines
  machines: WashingMachineConfig & DryerConfig;
  
  // Charges (réutilisation des types existants)
  costs: FixedCosts & VariableCosts;
  
  // Métadonnées
  created_at?: Date;
  updated_at?: Date;
}

// Résultats de la simulation
export interface SimulationResults {
  // Recettes lavage
  wash_7kg_turnover_month: number;
  wash_10kg_turnover_month: number;
  wash_18kg_turnover_month: number;
  total_wash_turnover_month: number;
  
  // Recettes séchage
  dry_small_turnover_month: number;
  dry_large_turnover_month: number;
  total_dry_turnover_month: number;
  
  // CA total
  project_turnover_month: number;
  
  // Cycles
  total_cycles_month: number;
  avg_revenue_per_cycle: number;
  
  // Charges
  fixed_costs_total: number;
  var_total_percent: number;
  estimated_variable_costs: number;
  
  // Rentabilité
  break_even_revenue_monthly: number | null;
  break_even_cycles_month: number | null;
  break_even_cycles_day: number | null;
  estimated_profit_month: number;
}

// Valeurs par défaut pour un nouveau projet
export const defaultMachineConfig: WashingMachineConfig & DryerConfig = {
  wash_7kg_count: 0,
  wash_7kg_price: 5.50,
  wash_7kg_cycles_day: 4,
  wash_10kg_count: 0,
  wash_10kg_price: 7.00,
  wash_10kg_cycles_day: 3,
  wash_18kg_count: 0,
  wash_18kg_price: 10.00,
  wash_18kg_cycles_day: 2,
  dry_small_count: 0,
  dry_small_price: 2.00,
  dry_small_cycles_day: 5,
  dry_large_count: 0,
  dry_large_price: 3.00,
  dry_large_cycles_day: 4,
};

export const defaultCosts: FixedCosts & VariableCosts = {
  fixed_rent: 0,
  fixed_lease: 0,
  fixed_subscriptions: 0,
  fixed_insurance: 0,
  fixed_cleaning: 0,
  fixed_other: 0,
  var_energy_water_percent: 0,
  var_detergent_percent: 0,
};

export const defaultSimulationProject: SimulationProject = {
  name: '',
  location: '',
  surface_m2: 0,
  opening_hours_description: '',
  machines: defaultMachineConfig,
  costs: defaultCosts,
};

// Fonctions de calcul
export function calculateSimulationResults(project: SimulationProject): SimulationResults {
  const { machines, costs } = project;
  const DAYS_PER_MONTH = 30;
  
  // Recettes lavage
  const wash_7kg_turnover_month = machines.wash_7kg_count * machines.wash_7kg_cycles_day * machines.wash_7kg_price * DAYS_PER_MONTH;
  const wash_10kg_turnover_month = machines.wash_10kg_count * machines.wash_10kg_cycles_day * machines.wash_10kg_price * DAYS_PER_MONTH;
  const wash_18kg_turnover_month = machines.wash_18kg_count * machines.wash_18kg_cycles_day * machines.wash_18kg_price * DAYS_PER_MONTH;
  const total_wash_turnover_month = wash_7kg_turnover_month + wash_10kg_turnover_month + wash_18kg_turnover_month;
  
  // Recettes séchage
  const dry_small_turnover_month = machines.dry_small_count * machines.dry_small_cycles_day * machines.dry_small_price * DAYS_PER_MONTH;
  const dry_large_turnover_month = machines.dry_large_count * machines.dry_large_cycles_day * machines.dry_large_price * DAYS_PER_MONTH;
  const total_dry_turnover_month = dry_small_turnover_month + dry_large_turnover_month;
  
  // CA total
  const project_turnover_month = total_wash_turnover_month + total_dry_turnover_month;
  
  // Total cycles
  const total_cycles_month = 
    (machines.wash_7kg_count * machines.wash_7kg_cycles_day * DAYS_PER_MONTH) +
    (machines.wash_10kg_count * machines.wash_10kg_cycles_day * DAYS_PER_MONTH) +
    (machines.wash_18kg_count * machines.wash_18kg_cycles_day * DAYS_PER_MONTH) +
    (machines.dry_small_count * machines.dry_small_cycles_day * DAYS_PER_MONTH) +
    (machines.dry_large_count * machines.dry_large_cycles_day * DAYS_PER_MONTH);
  
  const avg_revenue_per_cycle = total_cycles_month > 0 
    ? project_turnover_month / total_cycles_month 
    : 0;
  
  // Charges
  const fixed_costs_total = calculateFixedCostsTotal(costs);
  const var_total_percent = calculateVarTotalPercent(costs);
  const estimated_variable_costs = project_turnover_month * (var_total_percent / 100);
  
  // Seuil de rentabilité
  const break_even_revenue_monthly = var_total_percent < 100
    ? fixed_costs_total / (1 - var_total_percent / 100)
    : null;
  
  const break_even_cycles_month = 
    avg_revenue_per_cycle > 0 && break_even_revenue_monthly !== null
      ? break_even_revenue_monthly / avg_revenue_per_cycle
      : null;
  
  const break_even_cycles_day = break_even_cycles_month !== null
    ? break_even_cycles_month / DAYS_PER_MONTH
    : null;
  
  // Résultat estimé
  const estimated_profit_month = project_turnover_month - estimated_variable_costs - fixed_costs_total;
  
  return {
    wash_7kg_turnover_month,
    wash_10kg_turnover_month,
    wash_18kg_turnover_month,
    total_wash_turnover_month,
    dry_small_turnover_month,
    dry_large_turnover_month,
    total_dry_turnover_month,
    project_turnover_month,
    total_cycles_month,
    avg_revenue_per_cycle,
    fixed_costs_total,
    var_total_percent,
    estimated_variable_costs,
    break_even_revenue_monthly,
    break_even_cycles_month,
    break_even_cycles_day,
    estimated_profit_month,
  };
}
