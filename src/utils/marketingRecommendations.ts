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
        `Votre chiffre d'affaires est en baisse de ${Math.round(Math.abs(data.yearlyDropPercent))}% par rapport à l'année dernière. ` +
        "Plan d'action recommandé : publier au moins une fois par semaine sur votre fiche Google Business et sur vos réseaux sociaux (Facebook, Instagram), " +
        "mettre à jour les photos de la laverie et distribuer quelques flyers dans le quartier (commerces de proximité, résidences, Airbnb, hôtels). " +
        "L'objectif est de rappeler votre présence aux habitants et d'attirer de nouveaux clients.",
      difficulty: "Moyen",
      impactEstimate: "+200€/mois",
    });
  }

  // 2) Heures creuses du matin très faibles (< 5 % du CA)
  if (data.morningRevenueShare !== undefined && data.morningRevenueShare < 0.05) {
    recos.push({
      id: "mkt-morning-offer",
      category: "marketing",
      title: "Animer vos heures creuses du matin",
      description:
        `Les premières heures de la journée représentent seulement ${Math.round(data.morningRevenueShare * 100)}% de votre chiffre d'affaires. ` +
        "Vous pouvez tester une offre spécifique sur ce créneau (ex. -20 % avant 10h ou avantage fidélité). " +
        "Annoncez cette offre sur vos réseaux sociaux, sur votre fiche Google Business et via une affiche A4 à l'entrée de la laverie. " +
        "Le but est de lisser la fréquentation et de mieux utiliser vos machines en dehors des heures de pointe.",
      difficulty: "Faible",
      impactEstimate: "+150€/mois",
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
      title: `Mettre davantage en avant votre ${weakDryer.displayName}`,
      description:
        `Le ${weakDryer.displayName} génère nettement moins de chiffre d'affaires que vos autres sèche-linges. ` +
        "En complément d'un contrôle technique, vous pouvez améliorer sa visibilité : " +
        "ajout d'un sticker sur la machine (\"Pensez aussi à utiliser ce sèche-linge\"), " +
        "flèches ou pictogrammes au sol, et un petit message dans la laverie expliquant qu'il est disponible pour réduire le temps d'attente. " +
        "Ce type de micro-signalétique permet souvent de mieux répartir les clients sur l'ensemble du parc.",
      difficulty: "Faible",
      impactEstimate: "+80€/mois",
    });
  }

  // 4) Dimanche ou week-end très fort
  if (data.sundayShare !== undefined && data.sundayShare >= 0.18) {
    recos.push({
      id: "mkt-sunday-push",
      category: "marketing",
      title: "Capitaliser sur vos dimanches forts",
      description:
        `Le dimanche représente environ ${Math.round(data.sundayShare * 100)}% de vos cycles. ` +
        "Vous pouvez renforcer ce jour fort avec une communication récurrente : " +
        "un post Facebook / Instagram chaque samedi soir pour rappeler vos horaires du dimanche, " +
        "et un message en laverie du type \"Pensez à vos couettes et draps ce week-end\". " +
        "Cela aide vos clients à intégrer un réflexe régulier, notamment pour le linge volumineux.",
      difficulty: "Faible",
      impactEstimate: "+100€/mois",
    });
  }

  // 5) Paiement CB quasi exclusif
  if (data.cardPaymentShare !== undefined && data.cardPaymentShare > 0.75) {
    recos.push({
      id: "mkt-promote-card",
      category: "marketing",
      title: "Mettre en avant le paiement sans contact",
      description:
        `Plus de ${Math.round(data.cardPaymentShare * 100)}% de vos paiements sont réalisés en CB ou sans contact. ` +
        "C'est un vrai atout pour rassurer les nouveaux clients. " +
        "Ajoutez un visuel clair en vitrine (\"CB / Sans contact / Smartphone acceptés\") et mettez cette information " +
        "en avant sur votre fiche Google Business ainsi que sur vos réseaux sociaux. " +
        "C'est un détail simple qui peut lever une barrière psychologique chez certains clients.",
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
