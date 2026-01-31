/**
 * French translations for PDF exports.
 * PDFs are always generated in French for consistency.
 */

const frTranslations: Record<string, string> = {
  // Marketing recommendations
  "marketingRecommendations.perMonth": "mois",
  
  // Difficulty levels
  "marketingRecommendations.difficulty.low": "Faible",
  "marketingRecommendations.difficulty.medium": "Moyen",
  "marketingRecommendations.difficulty.high": "Élevé",
  
  // Months
  "marketingRecommendations.months.1": "janvier",
  "marketingRecommendations.months.2": "février",
  "marketingRecommendations.months.3": "mars",
  "marketingRecommendations.months.4": "avril",
  "marketingRecommendations.months.5": "mai",
  "marketingRecommendations.months.6": "juin",
  "marketingRecommendations.months.7": "juillet",
  "marketingRecommendations.months.8": "août",
  "marketingRecommendations.months.9": "septembre",
  "marketingRecommendations.months.10": "octobre",
  "marketingRecommendations.months.11": "novembre",
  "marketingRecommendations.months.12": "décembre",
  
  // Drop CA recommendation
  "marketingRecommendations.dropCa.title": "Renforcer votre visibilité locale",
  "marketingRecommendations.dropCa.description": "Votre chiffre d'affaires est en baisse de {{percent}}% par rapport à l'année dernière. Plan d'action recommandé : publier au moins une fois par semaine sur votre fiche Google Business et sur vos réseaux sociaux (Facebook, Instagram), mettre à jour les photos de la laverie et distribuer quelques flyers dans le quartier. L'objectif est de rappeler votre présence aux habitants et d'attirer de nouveaux clients.",
  
  // Morning offer recommendation
  "marketingRecommendations.morningOffer.title": "Animer vos heures creuses du matin",
  "marketingRecommendations.morningOffer.description": "Les premières heures de la journée représentent seulement {{percent}}% de votre chiffre d'affaires. Vous pouvez tester une offre spécifique sur ce créneau (ex. -20% avant 10h ou avantage fidélité). Annoncez cette offre sur vos réseaux sociaux et via une affiche A4 à l'entrée de la laverie.",
  
  // Weak dryer recommendation
  "marketingRecommendations.highlightWeakDryer.title": "Mettre davantage en avant votre {{machine}}",
  "marketingRecommendations.highlightWeakDryer.description": "Le {{machine}} génère nettement moins de chiffre d'affaires que vos autres sèche-linges. En complément d'un contrôle technique, vous pouvez améliorer sa visibilité : ajout d'un sticker sur la machine, flèches ou pictogrammes au sol, et un petit message expliquant qu'il est disponible pour réduire le temps d'attente.",
  
  // Sunday push recommendation
  "marketingRecommendations.sundayPush.title": "Capitaliser sur vos dimanches forts",
  "marketingRecommendations.sundayPush.description": "Le dimanche représente environ {{percent}}% de vos cycles. Vous pouvez renforcer ce jour fort avec une communication récurrente : un post Facebook/Instagram chaque samedi soir pour rappeler vos horaires du dimanche, et un message en laverie du type \"Pensez à vos couettes et draps ce week-end\".",
  
  // Card payment recommendation
  "marketingRecommendations.promoteCard.title": "Mettre en avant le paiement sans contact",
  "marketingRecommendations.promoteCard.description": "Plus de {{percent}}% de vos paiements sont réalisés en CB ou sans contact. C'est un vrai atout pour rassurer les nouveaux clients. Ajoutez un visuel clair en vitrine (\"CB / Sans contact / Smartphone acceptés\") et mettez cette information en avant sur votre fiche Google Business.",
  
  // Loyalty program recommendation
  "marketingRecommendations.loyaltyProgram.title": "Lancer un programme de fidélité simple",
  "marketingRecommendations.loyaltyProgram.description": "Seulement {{percent}}% de vos clients reviennent régulièrement. Testez une carte de fidélité papier (10 lavages = 1 offert) ou un système de points via QR code. Annoncez-le sur vos réseaux et avec une affiche en vitrine.",
  
  // Basket boost recommendation
  "marketingRecommendations.basketBoost.title": "Stimuler le panier moyen",
  "marketingRecommendations.basketBoost.description": "Votre panier moyen a baissé de {{percent}}% ce mois-ci. Proposez des offres combinées : \"Lavage + Séchage à tarif réduit\" ou mettez en avant vos machines grande capacité avec un sticker \"Idéal couettes & draps\".",
  
  // Big loads recommendation
  "marketingRecommendations.promoteBigLoads.title": "Promouvoir les machines grande capacité",
  "marketingRecommendations.promoteBigLoads.description": "Les cycles >10€ ne représentent que {{percent}}% de votre CA. Ciblez les familles et les locations Airbnb avec une communication dédiée : \"Lavez couettes, rideaux et draps en une seule fois\". Distribuez des flyers dans les résidences proches.",
  
  // Low season action recommendation
  "marketingRecommendations.lowSeasonAction.title": "Action spéciale {{month}}",
  "marketingRecommendations.lowSeasonAction.description": "{{month}} est habituellement un mois creux ({{percent}}% vs moyenne). Lancez une offre temporaire : \"-15% sur les séchages\" ou \"2ème lavage à -50%\" pour dynamiser la fréquentation. Relayez sur Google Business et vos réseaux.",
  
  // Momentum capitalize recommendation
  "marketingRecommendations.momentumCapitalize.title": "Capitaliser sur votre dynamique positive",
  "marketingRecommendations.momentumCapitalize.description": "Vous êtes en hausse de {{percent}}% vs le même mois l'an dernier. Profitez de cet élan pour collecter des avis Google, poster des photos de votre laverie bien remplie et remercier vos clients fidèles sur les réseaux.",
  
  // Frequency increase recommendation
  "marketingRecommendations.increaseFrequency.title": "Augmenter la fréquence de visite",
  "marketingRecommendations.increaseFrequency.description": "Vos clients fidèles viennent en moyenne {{visits}} fois/mois. Envoyez un rappel SMS ou email mi-mois : \"Votre linge s'accumule ? Pensez à nous !\" ou proposez un tarif préférentiel en semaine pour les habitués.",
  
  // Premium services recommendation
  "marketingRecommendations.premiumServices.title": "Proposer des services premium",
  "marketingRecommendations.premiumServices.description": "Votre panier moyen de {{amount}}€ montre une clientèle prête à payer. Envisagez des services additionnels : pressing express, pliage, livraison à domicile. Testez d'abord avec une affiche \"Service pliage disponible sur demande\".",
};

/**
 * Translation function for PDF exports (French only).
 * Mimics the i18next t() function interface.
 */
export function pdfTranslationFr(key: string, options?: Record<string, unknown>): string {
  let translation = frTranslations[key] || key;
  
  // Handle interpolation (e.g., {{percent}}, {{machine}})
  if (options) {
    Object.entries(options).forEach(([k, v]) => {
      translation = translation.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
    });
  }
  
  return translation;
}
