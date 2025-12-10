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
  
  // Fidélisation
  returningCustomerRate: number;      // Ex: 0.35 for 35% de clients réguliers
  averageVisitsPerMonth: number;      // Ex: 2.3 visites/mois par client fidèle
  
  // Panier moyen
  averageBasket: number;              // Ex: 8.50€
  averageBasketTrend: number;         // Ex: -0.05 for -5% vs mois précédent
  bigLoadsShare: number;              // Ex: 0.15 for 15% de gros cycles (>10€)
  
  // Saisonnalité
  currentMonth: number;               // 1-12
  monthlyRevenueVsAverage: number;    // Ex: -0.12 for -12% vs moyenne annuelle
  isLowSeason: boolean;               // Période creuse identifiée
  previousYearSameMonthDelta: number; // Ex: +0.08 for +8% vs même mois N-1
}

export interface MachinePerformance {
  id: string;
  displayName: string;
  type: "washer" | "dryer";
  revenue: number;
  revenueRatioVsTop: number;         // Ratio vs best performing machine of same type
}
