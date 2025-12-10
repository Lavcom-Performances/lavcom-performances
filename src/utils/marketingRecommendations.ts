import type { Recommendation, LaundromatAnalyticsData } from "@/types/recommendations";

/**
 * Generates marketing recommendations based on laundromat analytics data.
 * Rules-based engine that creates actionable marketing suggestions.
 */
export function generateMarketingRecommendations(data: LaundromatAnalyticsData): Recommendation[] {
  const recos: Recommendation[] = [];

  // 1) Baisse significative de CA vs N-1
  if (data.yearlyDropPercent <= -10) {
    recos.push({
      id: "mkt-drop-ca",
      category: "marketing",
      title: "Renforcer votre visibilité locale",
      description:
        `Votre chiffre d'affaires est en baisse de ${Math.abs(Math.round(data.yearlyDropPercent))}% vs l'année dernière. Plan d'action recommandé : publier au moins 1 fois par semaine sur Google Business et Facebook, renouveler les photos de la laverie et distribuer des flyers dans le quartier (commerces de proximité, résidences, Airbnb).`,
      difficulty: "Moyen",
      impactEstimate: "+200€/mois",
    });
  }

  // 2) Heures creuses très peu utilisées (ex. matin < 5% du CA)
  if (data.morningRevenueShare < 0.05) {
    recos.push({
      id: "mkt-morning-offer",
      category: "marketing",
      title: "Animer vos heures creuses du matin",
      description:
        `Les heures de début de matinée représentent seulement ${Math.round(data.morningRevenueShare * 100)}% de votre CA. Idée à tester : une offre -20% avant 10h, annoncée sur vos réseaux sociaux, votre fiche Google et via une affiche A4 à l'entrée de la laverie.`,
      difficulty: "Faible",
      impactEstimate: "+150€/mois",
    });
  }

  // 3) Machine ou SL sous-performant
  const weakDryer = data.machines.find(m => m.type === "dryer" && m.revenueRatioVsTop < 0.5);
  if (weakDryer) {
    recos.push({
      id: "mkt-highlight-weak-dryer",
      category: "marketing",
      title: `Mettre en avant votre ${weakDryer.displayName}`,
      description:
        `Le ${weakDryer.displayName} génère beaucoup moins de CA que vos autres sèche-linges. En plus du contrôle technique, ajoutez un sticker "Pensez à utiliser aussi ce sèche-linge" sur la machine et un petit rappel visuel dans la laverie (mur, table) pour répartir les clients.`,
      difficulty: "Faible",
      impactEstimate: "+80€/mois",
    });
  }

  // 4) Dimanche ou week-end très fort
  if (data.sundayShare >= 0.18) {
    recos.push({
      id: "mkt-sunday-push",
      category: "marketing",
      title: "Capitaliser sur vos dimanches forts",
      description:
        `Le dimanche représente environ ${Math.round(data.sundayShare * 100)}% de vos cycles. Vous pouvez renforcer ce jour fort avec un message récurrent : post Facebook/Instagram le samedi soir et affichage "Pensez à vos couettes et draps demain" à l'intérieur de la laverie.`,
      difficulty: "Faible",
      impactEstimate: "+100€/mois",
    });
  }

  // 5) Paiement CB quasi exclusif
  if (data.cardPaymentShare > 0.75) {
    recos.push({
      id: "mkt-promote-card",
      category: "marketing",
      title: "Mettre en avant le paiement sans contact",
      description:
        `Plus de ${Math.round(data.cardPaymentShare * 100)}% de vos paiements sont faits en CB ou sans contact. Ajoutez des visuels en vitrine et sur Google Business pour rassurer les nouveaux clients : "CB / Sans contact / Smartphone acceptés".`,
      difficulty: "Faible",
      impactEstimate: "+50€/mois",
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
  };
}
