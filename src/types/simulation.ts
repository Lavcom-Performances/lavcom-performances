// Types pour le module Simulation (Futurs exploitants)

// Configuration d'une machine individuelle avec poids personnalisable
export interface MachineConfig {
  id: string;
  type: 'washer' | 'dryer';
  capacity_kg: number;
  count: number;
  price: number;
  cycles_day: number;
}

// Options de poids pour les machines
export const WASHER_CAPACITIES = [6, 7, 8, 10, 11, 13, 14, 18, 20, 25, 27] as const;
export const DRYER_CAPACITIES = [10, 13, 14, 15, 18, 20, 25, 34] as const;

// Types d'abonnements disponibles
export const SUBSCRIPTION_TYPES = [
  { id: 'payment_terminal', label: 'Centrale de paiement' },
  { id: 'remote_management', label: 'Télégestion' },
  { id: 'internet', label: 'Internet' },
  { id: 'phone', label: 'Téléphone' },
  { id: 'alarm', label: 'Alarme / Vidéosurveillance' },
  { id: 'software', label: 'Logiciel de gestion' },
  { id: 'maintenance_contract', label: 'Contrat de maintenance' },
  { id: 'other', label: 'Autre abonnement' },
] as const;

// Charge fixe individuelle
export interface FixedCostItem {
  id: string;
  label: string;
  amount: number;
  category: 'rent' | 'lease' | 'subscription' | 'insurance' | 'tax' | 'salary' | 'cleaning' | 'other';
}

// Charge variable individuelle
export interface VariableCostItem {
  id: string;
  label: string;
  percent: number;
  category: 'electricity' | 'water' | 'gas' | 'detergent' | 'other';
}

// Projet de simulation complet
export interface SimulationProject {
  id?: string;
  name: string;
  location: string;
  city?: string;
  postal_code?: string;
  department?: string;
  zone_type?: string;
  surface_m2: number;
  opening_hours_description: string;
  
  // Machines avec configuration flexible
  machines: MachineConfig[];
  
  // Charges détaillées
  fixed_costs: FixedCostItem[];
  variable_costs: VariableCostItem[];
  
  // Métadonnées
  created_at?: Date;
  updated_at?: Date;
}

// Résultats de la simulation
export interface SimulationResults {
  // Recettes par machine
  machine_revenues: { id: string; turnover_month: number }[];
  
  // Totaux recettes
  total_wash_turnover_month: number;
  total_dry_turnover_month: number;
  project_turnover_month: number;
  
  // Cycles
  total_cycles_month: number;
  avg_revenue_per_cycle: number;
  
  // Charges
  fixed_costs_total: number;
  variable_costs_total: number;
  var_total_percent: number;
  
  // Rentabilité
  break_even_revenue_monthly: number | null;
  break_even_cycles_month: number | null;
  break_even_cycles_day: number | null;
  estimated_profit_month: number;
}

// Valeurs par défaut pour les charges fixes
export const defaultFixedCosts: FixedCostItem[] = [
  { id: 'rent', label: 'Loyer', amount: 0, category: 'rent' },
  { id: 'charges', label: 'Charges locatives', amount: 0, category: 'rent' },
  { id: 'lease', label: 'Prêt / leasing machines', amount: 0, category: 'lease' },
  { id: 'insurance', label: 'Assurance', amount: 0, category: 'insurance' },
  { id: 'cfe', label: 'CFE (Cotisation Foncière)', amount: 0, category: 'tax' },
  { id: 'cleaning', label: 'Ménage / entretien', amount: 0, category: 'cleaning' },
];

// Valeurs par défaut pour les charges variables
export const defaultVariableCosts: VariableCostItem[] = [
  { id: 'electricity', label: 'Électricité', percent: 0, category: 'electricity' },
  { id: 'water', label: 'Eau', percent: 0, category: 'water' },
  { id: 'gas', label: 'Gaz', percent: 0, category: 'gas' },
  { id: 'detergent', label: 'Lessive / produits', percent: 0, category: 'detergent' },
];

// Valeurs par défaut pour un nouveau projet
export const defaultSimulationProject: SimulationProject = {
  name: '',
  location: '',
  surface_m2: 0,
  opening_hours_description: '',
  machines: [],
  fixed_costs: [...defaultFixedCosts],
  variable_costs: [...defaultVariableCosts],
};

// Fonctions de calcul
export function calculateSimulationResults(project: SimulationProject): SimulationResults {
  const { machines, fixed_costs, variable_costs } = project;
  const DAYS_PER_MONTH = 30;
  
  // Calcul des revenus par machine
  const machine_revenues = machines.map(machine => ({
    id: machine.id,
    turnover_month: machine.count * machine.cycles_day * machine.price * DAYS_PER_MONTH
  }));
  
  // Totaux par type
  const total_wash_turnover_month = machines
    .filter(m => m.type === 'washer')
    .reduce((sum, m) => sum + m.count * m.cycles_day * m.price * DAYS_PER_MONTH, 0);
  
  const total_dry_turnover_month = machines
    .filter(m => m.type === 'dryer')
    .reduce((sum, m) => sum + m.count * m.cycles_day * m.price * DAYS_PER_MONTH, 0);
  
  const project_turnover_month = total_wash_turnover_month + total_dry_turnover_month;
  
  // Total cycles
  const total_cycles_month = machines.reduce(
    (sum, m) => sum + m.count * m.cycles_day * DAYS_PER_MONTH, 
    0
  );
  
  const avg_revenue_per_cycle = total_cycles_month > 0 
    ? project_turnover_month / total_cycles_month 
    : 0;
  
  // Charges fixes
  const fixed_costs_total = fixed_costs.reduce((sum, cost) => sum + cost.amount, 0);
  
  // Charges variables
  const var_total_percent = variable_costs.reduce((sum, cost) => sum + cost.percent, 0);
  const variable_costs_total = project_turnover_month * (var_total_percent / 100);
  
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
  const estimated_profit_month = project_turnover_month - variable_costs_total - fixed_costs_total;
  
  return {
    machine_revenues,
    total_wash_turnover_month,
    total_dry_turnover_month,
    project_turnover_month,
    total_cycles_month,
    avg_revenue_per_cycle,
    fixed_costs_total,
    variable_costs_total,
    var_total_percent,
    break_even_revenue_monthly,
    break_even_cycles_month,
    break_even_cycles_day,
    estimated_profit_month,
  };
}
