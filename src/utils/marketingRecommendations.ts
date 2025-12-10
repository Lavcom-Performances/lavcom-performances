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

  // 6) Faible taux de clients fidèles
  if (data.returningCustomerRate < 0.25) {
    recos.push({
      id: "mkt-loyalty-program",
      category: "marketing",
      title: "Lancer un programme de fidélité simple",
      description:
        `Seulement ${Math.round(data.returningCustomerRate * 100)}% de vos clients reviennent régulièrement. Testez une carte de fidélité papier (10 lavages = 1 offert) ou un système de points via QR code. Annoncez-le sur vos réseaux et avec une affiche en vitrine.`,
      difficulty: "Moyen",
      impactEstimate: "+180€/mois",
    });
  }

  // 7) Panier moyen en baisse
  if (data.averageBasketTrend <= -0.08) {
    recos.push({
      id: "mkt-basket-boost",
      category: "marketing",
      title: "Stimuler le panier moyen",
      description:
        `Votre panier moyen a baissé de ${Math.abs(Math.round(data.averageBasketTrend * 100))}% ce mois-ci. Proposez des offres combinées : "Lavage + Séchage à tarif réduit" ou mettez en avant vos machines grande capacité avec un sticker "Idéal couettes & draps".`,
      difficulty: "Faible",
      impactEstimate: "+100€/mois",
    });
  }

  // 8) Peu de gros cycles (grande capacité sous-utilisée)
  if (data.bigLoadsShare < 0.10) {
    recos.push({
      id: "mkt-promote-big-loads",
      category: "marketing",
      title: "Promouvoir les machines grande capacité",
      description:
        `Les cycles >10€ ne représentent que ${Math.round(data.bigLoadsShare * 100)}% de votre CA. Ciblez les familles et les locations Airbnb avec une communication dédiée : "Lavez couettes, rideaux et draps en une seule fois". Distribuez des flyers dans les résidences proches.`,
      difficulty: "Faible",
      impactEstimate: "+120€/mois",
    });
  }

  // 9) Période creuse saisonnière
  if (data.isLowSeason && data.monthlyRevenueVsAverage < -0.10) {
    const monthNames = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
    const currentMonthName = monthNames[data.currentMonth - 1] || "ce mois";
    recos.push({
      id: "mkt-low-season-action",
      category: "marketing",
      title: `Action spéciale ${currentMonthName}`,
      description:
        `${currentMonthName.charAt(0).toUpperCase() + currentMonthName.slice(1)} est habituellement un mois creux (${Math.round(data.monthlyRevenueVsAverage * 100)}% vs moyenne). Lancez une offre temporaire : "-15% sur les séchages" ou "2ème lavage à -50%" pour dynamiser la fréquentation. Relayez sur Google Business et vos réseaux.`,
      difficulty: "Moyen",
      impactEstimate: "+150€/mois",
    });
  }

  // 10) Bonne performance vs N-1 même mois – capitaliser
  if (data.previousYearSameMonthDelta >= 0.10) {
    recos.push({
      id: "mkt-momentum-capitalize",
      category: "marketing",
      title: "Capitaliser sur votre dynamique positive",
      description:
        `Vous êtes en hausse de ${Math.round(data.previousYearSameMonthDelta * 100)}% vs le même mois l'an dernier. Profitez de cet élan pour collecter des avis Google, poster des photos de votre laverie bien remplie et remercier vos clients fidèles sur les réseaux.`,
      difficulty: "Faible",
      impactEstimate: "+80€/mois",
    });
  }

  // 11) Clients fidèles peu fréquents
  if (data.returningCustomerRate >= 0.30 && data.averageVisitsPerMonth < 1.5) {
    recos.push({
      id: "mkt-increase-frequency",
      category: "marketing",
      title: "Augmenter la fréquence de visite",
      description:
        `Vos clients fidèles viennent en moyenne ${data.averageVisitsPerMonth.toFixed(1)} fois/mois. Envoyez un rappel SMS ou email mi-mois : "Votre linge s'accumule ? Pensez à nous !" ou proposez un tarif préférentiel en semaine pour les habitués.`,
      difficulty: "Moyen",
      impactEstimate: "+130€/mois",
    });
  }

  // 12) Panier moyen élevé – upsell services
  if (data.averageBasket >= 12) {
    recos.push({
      id: "mkt-premium-services",
      category: "marketing",
      title: "Proposer des services premium",
      description:
        `Votre panier moyen de ${data.averageBasket.toFixed(2)}€ montre une clientèle prête à payer. Envisagez des services additionnels : pressing express, pliage, livraison à domicile. Testez d'abord avec une affiche "Service pliage disponible sur demande".`,
      difficulty: "Élevé",
      impactEstimate: "+250€/mois",
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
