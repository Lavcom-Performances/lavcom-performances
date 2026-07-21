import * as options from "./simulatorFormOptions.types"

export interface MachineConfig {
  id: string;
  type: 'washer' | 'dryer';
  capacityKg: number;
  count: number;
  price: number;
  cyclesPerDay: number;
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
  
  // Revenues
  washingRevenue: number;
  dryingRevenue: number;
  totalRevenue: number;
  
  // Metadata
  createdAt?: Date;
  updatedAt?: Date;
}
