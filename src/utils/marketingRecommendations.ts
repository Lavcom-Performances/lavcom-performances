import type { Recommendation, LaundromatAnalyticsData, DifficultyLevel } from "@/types/recommendations";

// Generic translation function type that works with both i18next and PDF exports
export type TranslateFunction = (key: string, options?: Record<string, unknown>) => string;

/**
 * Generates marketing recommendations based on laundromat analytics data.
 * Rules-based engine that creates actionable marketing suggestions.
 * Now internationalized - requires a translation function.
 */
export function generateMarketingRecommendations(
  data: LaundromatAnalyticsData,
  t: TranslateFunction
): Recommendation[] {
  const recos: Recommendation[] = [];

  // 1) Baisse significative de CA vs N-1
  if (data.yearlyDropPercent <= -10) {
    recos.push({
      id: "mkt-drop-ca",
      category: "marketing",
      title: t("marketingRecommendations.dropCa.title"),
      description: t("marketingRecommendations.dropCa.description", { 
        percent: Math.round(Math.abs(data.yearlyDropPercent)) 
      }),
      difficulty: "medium" as DifficultyLevel,
      impactEstimate: "+200€/" + t("marketingRecommendations.perMonth"),
    });
  }

  // 2) Heures creuses du matin très faibles (< 5 % du CA)
  if (data.morningRevenueShare !== undefined && data.morningRevenueShare < 0.05) {
    recos.push({
      id: "mkt-morning-offer",
      category: "marketing",
      title: t("marketingRecommendations.morningOffer.title"),
      description: t("marketingRecommendations.morningOffer.description", { 
        percent: Math.round(data.morningRevenueShare * 100) 
      }),
      difficulty: "low" as DifficultyLevel,
      impactEstimate: "+150€/" + t("marketingRecommendations.perMonth"),
    });
  }

  // 3) Sèche-linge ou machine très sous-performant(e)
  const weakDryer = data.machines?.find(
    (m) => m.type === "dryer" && m.revenueRatioVsTop !== undefined && m.revenueRatioVsTop < 0.5
  );
  if (weakDryer) {
    recos.push({
      id: "mkt-highlight-weak-dryer",
      category: "marketing",
      title: t("marketingRecommendations.highlightWeakDryer.title", { 
        machine: weakDryer.displayName 
      }),
      description: t("marketingRecommendations.highlightWeakDryer.description", { 
        machine: weakDryer.displayName 
      }),
      difficulty: "low" as DifficultyLevel,
      impactEstimate: "+80€/" + t("marketingRecommendations.perMonth"),
    });
  }

  // 4) Dimanche ou week-end très fort
  if (data.sundayShare !== undefined && data.sundayShare >= 0.18) {
    recos.push({
      id: "mkt-sunday-push",
      category: "marketing",
      title: t("marketingRecommendations.sundayPush.title"),
      description: t("marketingRecommendations.sundayPush.description", { 
        percent: Math.round(data.sundayShare * 100) 
      }),
      difficulty: "low" as DifficultyLevel,
      impactEstimate: "+100€/" + t("marketingRecommendations.perMonth"),
    });
  }

  // 5) Paiement CB quasi exclusif
  if (data.cardPaymentShare !== undefined && data.cardPaymentShare > 0.75) {
    recos.push({
      id: "mkt-promote-card",
      category: "marketing",
      title: t("marketingRecommendations.promoteCard.title"),
      description: t("marketingRecommendations.promoteCard.description", { 
        percent: Math.round(data.cardPaymentShare * 100) 
      }),
      difficulty: "low" as DifficultyLevel,
      impactEstimate: "+50€/" + t("marketingRecommendations.perMonth"),
    });
  }

  // 6) Faible taux de clients fidèles
  if (data.returningCustomerRate < 0.25) {
    recos.push({
      id: "mkt-loyalty-program",
      category: "marketing",
      title: t("marketingRecommendations.loyaltyProgram.title"),
      description: t("marketingRecommendations.loyaltyProgram.description", { 
        percent: Math.round(data.returningCustomerRate * 100) 
      }),
      difficulty: "medium" as DifficultyLevel,
      impactEstimate: "+180€/" + t("marketingRecommendations.perMonth"),
    });
  }

  // 7) Panier moyen en baisse
  if (data.averageBasketTrend <= -0.08) {
    recos.push({
      id: "mkt-basket-boost",
      category: "marketing",
      title: t("marketingRecommendations.basketBoost.title"),
      description: t("marketingRecommendations.basketBoost.description", { 
        percent: Math.abs(Math.round(data.averageBasketTrend * 100)) 
      }),
      difficulty: "low" as DifficultyLevel,
      impactEstimate: "+100€/" + t("marketingRecommendations.perMonth"),
    });
  }

  // 8) Peu de gros cycles (grande capacité sous-utilisée)
  if (data.bigLoadsShare < 0.10) {
    recos.push({
      id: "mkt-promote-big-loads",
      category: "marketing",
      title: t("marketingRecommendations.promoteBigLoads.title"),
      description: t("marketingRecommendations.promoteBigLoads.description", { 
        percent: Math.round(data.bigLoadsShare * 100) 
      }),
      difficulty: "low" as DifficultyLevel,
      impactEstimate: "+120€/" + t("marketingRecommendations.perMonth"),
    });
  }

  // 9) Période creuse saisonnière
  if (data.isLowSeason && data.monthlyRevenueVsAverage < -0.10) {
    const currentMonthName = t(`marketingRecommendations.months.${data.currentMonth}`);
    recos.push({
      id: "mkt-low-season-action",
      category: "marketing",
      title: t("marketingRecommendations.lowSeasonAction.title", { month: currentMonthName }),
      description: t("marketingRecommendations.lowSeasonAction.description", { 
        month: currentMonthName,
        percent: Math.round(data.monthlyRevenueVsAverage * 100) 
      }),
      difficulty: "medium" as DifficultyLevel,
      impactEstimate: "+150€/" + t("marketingRecommendations.perMonth"),
    });
  }

  // 10) Bonne performance vs N-1 même mois – capitaliser
  if (data.previousYearSameMonthDelta >= 0.10) {
    recos.push({
      id: "mkt-momentum-capitalize",
      category: "marketing",
      title: t("marketingRecommendations.momentumCapitalize.title"),
      description: t("marketingRecommendations.momentumCapitalize.description", { 
        percent: Math.round(data.previousYearSameMonthDelta * 100) 
      }),
      difficulty: "low" as DifficultyLevel,
      impactEstimate: "+80€/" + t("marketingRecommendations.perMonth"),
    });
  }

  // 11) Clients fidèles peu fréquents
  if (data.returningCustomerRate >= 0.30 && data.averageVisitsPerMonth < 1.5) {
    recos.push({
      id: "mkt-increase-frequency",
      category: "marketing",
      title: t("marketingRecommendations.increaseFrequency.title"),
      description: t("marketingRecommendations.increaseFrequency.description", { 
        visits: data.averageVisitsPerMonth.toFixed(1) 
      }),
      difficulty: "medium" as DifficultyLevel,
      impactEstimate: "+130€/" + t("marketingRecommendations.perMonth"),
    });
  }

  // 12) Panier moyen élevé – upsell services
  if (data.averageBasket >= 12) {
    recos.push({
      id: "mkt-premium-services",
      category: "marketing",
      title: t("marketingRecommendations.premiumServices.title"),
      description: t("marketingRecommendations.premiumServices.description", { 
        amount: data.averageBasket.toFixed(2) 
      }),
      difficulty: "high" as DifficultyLevel,
      impactEstimate: "+250€/" + t("marketingRecommendations.perMonth"),
    });
  }

  return recos;
}

/**
 * Returns mock analytics data for demonstration purposes.
 * In production, this would come from the actual data API.
 */
export function getMockAnalyticsData(): LaundromatAnalyticsData {
  return {
    yearlyDropPercent: -27,
    morningRevenueShare: 0.04,
    sundayShare: 0.21,
    cardPaymentShare: 0.81,
    peakHour: "18h",
    machines: [
      { id: "sl1", displayName: "Sèche-linge 1", type: "dryer", revenue: 1606, revenueRatioVsTop: 1 },
      { id: "sl2", displayName: "Sèche-linge 2", type: "dryer", revenue: 219, revenueRatioVsTop: 0.136 },
      { id: "ll1", displayName: "Lave-linge 1", type: "washer", revenue: 1200, revenueRatioVsTop: 1 },
      { id: "ll2", displayName: "Lave-linge 2", type: "washer", revenue: 980, revenueRatioVsTop: 0.82 },
    ],
    // Fidélisation
    returningCustomerRate: 0.22,
    averageVisitsPerMonth: 1.8,
    // Panier moyen
    averageBasket: 8.50,
    averageBasketTrend: -0.12,
    bigLoadsShare: 0.08,
    // Saisonnalité
    currentMonth: 12,
    monthlyRevenueVsAverage: -0.15,
    isLowSeason: true,
    previousYearSameMonthDelta: 0.05,
  };
}
