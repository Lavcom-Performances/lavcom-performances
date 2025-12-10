// Types for recommendation system

export type RecommendationCategory = "pricing" | "operations" | "maintenance" | "marketing";
export type DifficultyLevel = "Faible" | "Moyen" | "Élevé";

export interface Recommendation {
  id: string;
  category: RecommendationCategory;
  title: string;
  description: string;
  impactEstimate?: string;   // ex: "+120€/mois"
  difficulty?: DifficultyLevel;
  metric?: string;
}

// Analytics data interface for recommendation generation
export interface LaundromatAnalyticsData {
  yearlyDropPercent: number;          // Ex: -27 for -27%
  morningRevenueShare: number;        // Ex: 0.04 for 4%
  sundayShare: number;                // Ex: 0.21 for 21%
  cardPaymentShare: number;           // Ex: 0.81 for 81%
  peakHour: string;                   // Ex: "18h"
  machines: MachinePerformance[];
}

export interface MachinePerformance {
  id: string;
  displayName: string;
  type: "washer" | "dryer";
  revenue: number;
  revenueRatioVsTop: number;         // Ratio vs best performing machine of same type
}
