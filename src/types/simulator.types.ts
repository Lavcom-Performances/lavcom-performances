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

export interface FixedCostCategory {
  rent: { label: string; category: FixedCostItem['category'] };
  rentalCharges: { label: string; category: FixedCostItem['category'] }; 
  lease: { label: string; category: FixedCostItem['category'] };
  insurance: { label: string; category: FixedCostItem['category'] };
  cfe: { label: string; category: FixedCostItem['category'] };
  taxes: { label: string; category: FixedCostItem['category'] };
  salary: { label: string; category: FixedCostItem['category'] };
  cleaning: { label: string; category: FixedCostItem['category'] };
  other: { label: string; category: FixedCostItem['category'] };
}

export interface VariableCostCategory {
  electricity: { label: string; category: VariableCostItem['category'] };
  water: { label: string; category: VariableCostItem['category'] };
  gas: { label: string; category: VariableCostItem['category'] };
  detergent: { label: string; category: VariableCostItem['category'] };
  other: { label: string; category: VariableCostItem['category'] };
}

export interface SubscriptionCategory {
  paymentTerminal: { label: string; category: FixedCostItem['category'] };
  remoteManagement: { label: string; category: FixedCostItem['category'] };
  internet: { label: string; category: FixedCostItem['category'] };
  phone: { label: string; category: FixedCostItem['category'] };
  alarm: { label: string; category: FixedCostItem['category'] };
  managementSoftware: { label: string; category: FixedCostItem['category'] };
  maintenanceContract: { label: string; category: FixedCostItem['category'] };
  otherSubscription: { label: string; category: FixedCostItem['category'] };
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
