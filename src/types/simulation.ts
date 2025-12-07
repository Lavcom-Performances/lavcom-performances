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

// Types pour les contraintes du local
export type LocalShape = 'rectangular' | 'narrow_long' | 'l_shaped' | 'corner_windows';
export type StructuralObstacles = 'none' | 'some' | 'many';
export type FacadeModifiable = 'yes' | 'no' | 'unknown';
export type TechnicalConstraintsLevel = 'ok' | 'check_with_installer' | 'heavy_works';

// Labels pour les options
export const LOCAL_SHAPE_OPTIONS = [
  { value: 'rectangular', label: 'Rectangulaire, murs plutôt pleins' },
  { value: 'narrow_long', label: 'Long et étroit' },
  { value: 'l_shaped', label: 'En L / découpé' },
  { value: 'corner_windows', label: 'Angle avec beaucoup de vitrines' },
] as const;

export const STRUCTURAL_OBSTACLES_OPTIONS = [
  { value: 'none', label: 'Aucun obstacle particulier' },
  { value: 'some', label: 'Quelques poteaux / gaines le long des murs' },
  { value: 'many', label: 'Plusieurs poteaux / murs porteurs gênants' },
] as const;

export const FACADE_MODIFIABLE_OPTIONS = [
  { value: 'yes', label: 'Oui, il est possible de déposer une vitrine' },
  { value: 'no', label: 'Non, façade non modifiable' },
  { value: 'unknown', label: 'Je ne sais pas encore' },
] as const;

export const TECHNICAL_CONSTRAINTS_OPTIONS = [
  { value: 'ok', label: 'A priori OK (eau, évacuation, puissance, ventilation)' },
  { value: 'check_with_installer', label: 'À vérifier avec un installateur' },
  { value: 'heavy_works', label: 'Gros travaux à prévoir' },
] as const;

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
  
  // Contraintes du local (Étape 0)
  local_shape?: LocalShape;
  has_structural_obstacles?: StructuralObstacles;
  door_width_cm?: number;
  can_modify_facade?: FacadeModifiable;
  technical_constraints_level?: TechnicalConstraintsLevel;
  
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

// Valeurs indicatives pour les charges fixes (basées sur moyennes marché)
export const defaultFixedCosts: FixedCostItem[] = [
  { id: 'rent', label: 'Loyer', amount: 1200, category: 'rent' },
  { id: 'charges', label: 'Charges locatives', amount: 150, category: 'rent' },
  { id: 'lease', label: 'Prêt / leasing machines', amount: 800, category: 'lease' },
  { id: 'insurance', label: 'Assurance', amount: 120, category: 'insurance' },
  { id: 'cfe', label: 'CFE (Cotisation Foncière)', amount: 80, category: 'tax' },
  { id: 'cleaning', label: 'Ménage / entretien', amount: 250, category: 'cleaning' },
];

// Valeurs indicatives pour les charges variables (% moyens du CA)
export const defaultVariableCosts: VariableCostItem[] = [
  { id: 'electricity', label: 'Électricité', percent: 10, category: 'electricity' },
  { id: 'water', label: 'Eau', percent: 4, category: 'water' },
  { id: 'gas', label: 'Gaz', percent: 0, category: 'gas' },
  { id: 'detergent', label: 'Lessive / produits', percent: 4, category: 'detergent' },
];

// Configuration machine par défaut (config standard petite laverie)
export const defaultMachines: MachineConfig[] = [
  { id: 'wash_7kg_default', type: 'washer', capacity_kg: 7, count: 2, price: 5.5, cycles_day: 4 },
  { id: 'wash_10kg_default', type: 'washer', capacity_kg: 10, count: 2, price: 7, cycles_day: 3 },
  { id: 'wash_18kg_default', type: 'washer', capacity_kg: 18, count: 1, price: 10, cycles_day: 2 },
  { id: 'dry_14kg_default', type: 'dryer', capacity_kg: 14, count: 2, price: 2, cycles_day: 5 },
  { id: 'dry_18kg_default', type: 'dryer', capacity_kg: 18, count: 1, price: 3, cycles_day: 4 },
];

// Valeurs par défaut pour un nouveau projet (pré-rempli avec valeurs indicatives)
export const defaultSimulationProject: SimulationProject = {
  name: '',
  location: '',
  surface_m2: 40,
  opening_hours_description: '7h - 21h',
  zone_type: 'urbain',
  // Contraintes du local par défaut
  local_shape: 'rectangular',
  has_structural_obstacles: 'none',
  door_width_cm: 90,
  can_modify_facade: 'unknown',
  technical_constraints_level: 'check_with_installer',
  machines: [...defaultMachines],
  fixed_costs: [...defaultFixedCosts],
  variable_costs: [...defaultVariableCosts],
};

// Fonctions de calcul des contraintes du local
export function getShapeFactor(localShape?: LocalShape): number {
  switch (localShape) {
    case 'rectangular': return 1.0;
    case 'narrow_long': return 0.85;
    case 'l_shaped': return 0.8;
    case 'corner_windows': return 0.8;
    default: return 1.0;
  }
}

export function getObstacleFactor(obstacles?: StructuralObstacles): number {
  switch (obstacles) {
    case 'none': return 1.0;
    case 'some': return 0.9;
    case 'many': return 0.8;
    default: return 1.0;
  }
}

export function calculateMaxMachinesEstimate(project: SimulationProject): number {
  const usableArea = project.surface_m2 * 0.7;
  const shapeFactor = getShapeFactor(project.local_shape);
  const obstacleFactor = getObstacleFactor(project.has_structural_obstacles);
  const baseCapacity = usableArea / 3.5; // 3.5 m² par machine
  return Math.floor(baseCapacity * shapeFactor * obstacleFactor);
}

export function getTotalUserMachines(project: SimulationProject): number {
  return project.machines.reduce((sum, m) => sum + m.count, 0);
}

export function hasLargeWashers(project: SimulationProject): boolean {
  return project.machines.some(m => m.type === 'washer' && m.capacity_kg >= 18 && m.count > 0);
}

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
