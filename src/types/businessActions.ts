// Types for Business Actions feature

export type EffortLevel = "low" | "medium" | "high";
export type ActionCategory = "revenue" | "operations" | "marketing" | "maintenance";

export interface ActionStep {
  step: number;
  description: string;
}

export interface BusinessAction {
  id: string;
  title: string;
  description: string;
  category: ActionCategory;
  impactEstimate: number; // €/mois
  effort: EffortLevel;
  kpiToTrack: string;
  steps: ActionStep[];
  priority: number; // 1 = highest
}

export interface BusinessActionsData {
  // Revenue data
  totalRevenue: number;
  revenueByCard: number;
  revenueByCash: number;
  cardPercentage: number;
  
  // Transaction data
  totalTransactions: number;
  averageBasket: number;
  
  // Time-based data
  peakHour: number | null;
  morningRevenue: number; // 6h-10h
  eveningRevenue: number; // 17h-21h
  
  // Day-based data
  weekdayPerformance: { day: string; revenue: number }[];
  bestDay: string | null;
  worstDay: string | null;
  
  // Machine data
  machineCount: number;
  underperformingMachines: { name: string; revenueGap: number }[];
  
  // Data quality
  dataPoints: number; // number of days with data
  hasEnoughData: boolean; // at least 7 days
}
