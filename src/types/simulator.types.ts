import * as options from "./simulatorFormOptions.types"

export interface MachineConfig {
  id: string;
  type: 'washer' | 'dryer';
  capacity_kg: number;
  count: number;
  price: number;
  cycles_day: number;
}

export interface FixedCostItem {
  id: string;
  label: string;
  amount: number;
  category: 'rent' | 'lease' | 'subscription' | 'insurance' | 'tax' | 'salary' | 'cleaning' | 'other';
}

export interface VariableCostItem {
  id: string;
  label: string;
  percent: number;
  category: 'electricity' | 'water' | 'gas' | 'detergent' | 'other';
}

export interface SimulationProject {
  // Project infos
  id?: string;
  projectName: string;
  scenarioName: string;
  country: string;
  address: string;
  city: string;
  postalCode?: string;
  departmentCode?: string;
  departmentName?: string;
  region?: string;
  zoneType: string;
  openingHours: Partial<options.OpeningHoursOption>;
  openingDays: Partial<options.OpeningDaysOption>;
  
  // Constaints
  surface: number;
  localShape: options.LocalShapeValue;
  structuralObstacles: options.StructuralObstacleValue;
  doorWidth: number;
  canModifyFacade: options.FacadeOptionValue;
  technicalConstraints: options.TechnicalConstraintValue;
  
  // Machines
  machines: MachineConfig[];
  
  // Charges
  fixedCosts: FixedCostItem[];
  variableCosts: VariableCostItem[];
  
  // Metadata
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SimulatorProjectFormProps {
  project: Partial<SimulationProject>;
  onUpdate: (updates: Partial<SimulationProject>) => void;
}

// Indicative values ​​for fixed costs (based on market averages)
export const defaultFixedCosts: FixedCostItem[] = [
  { id: 'rent', label: 'Loyer', amount: 1200, category: 'rent' },
  { id: 'charges', label: 'Charges locatives', amount: 150, category: 'rent' },
  { id: 'lease', label: 'Prêt / leasing machines', amount: 800, category: 'lease' },
  { id: 'insurance', label: 'Assurance', amount: 120, category: 'insurance' },
  { id: 'cfe', label: 'CFE (Cotisation Foncière)', amount: 80, category: 'tax' },
  { id: 'cleaning', label: 'Ménage / entretien', amount: 250, category: 'cleaning' },
];

// Indicative values ​​for variable costs (average % of revenue)
export const defaultVariableCosts: VariableCostItem[] = [
  { id: 'electricity', label: 'Électricité', percent: 10, category: 'electricity' },
  { id: 'water', label: 'Eau', percent: 4, category: 'water' },
  { id: 'gas', label: 'Gaz', percent: 0, category: 'gas' },
  { id: 'detergent', label: 'Lessive / produits', percent: 4, category: 'detergent' },
];

// Default machine configuration (standard small laundromat configuration)
export const defaultMachines: MachineConfig[] = [
  { id: 'wash_7kg_default', type: 'washer', capacity_kg: 7, count: 2, price: 5.5, cycles_day: 4 },
  { id: 'wash_10kg_default', type: 'washer', capacity_kg: 10, count: 2, price: 7, cycles_day: 3 },
  { id: 'wash_18kg_default', type: 'washer', capacity_kg: 18, count: 1, price: 10, cycles_day: 2 },
  { id: 'dry_14kg_default', type: 'dryer', capacity_kg: 14, count: 2, price: 2, cycles_day: 5 },
  { id: 'dry_18kg_default', type: 'dryer', capacity_kg: 18, count: 1, price: 3, cycles_day: 4 },
];
