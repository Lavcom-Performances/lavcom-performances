// ============================================
// CONFIGURATION CENTRALISÉE DES TARIFS
// ============================================

// Tarifs EXPLOITANTS : abonnements par laverie
export const LAUNDROMAT_PRICING = {
  monthly: {
    tier1: { min: 1, max: 2, pricePerLaundromat: 29 },
    tier2: { min: 3, max: 5, pricePerLaundromat: 25 },
    tier3: { min: 6, max: Infinity, pricePerLaundromat: 21 },
  },
  annual: {
    // 10 mois payés, 2 offerts
    factor: 10,
  },
};

export function getMonthlyPricePerLaundromat(n: number): number {
  if (n <= 0) return 0;
  if (n <= LAUNDROMAT_PRICING.monthly.tier1.max)
    return LAUNDROMAT_PRICING.monthly.tier1.pricePerLaundromat;
  if (n <= LAUNDROMAT_PRICING.monthly.tier2.max)
    return LAUNDROMAT_PRICING.monthly.tier2.pricePerLaundromat;
  return LAUNDROMAT_PRICING.monthly.tier3.pricePerLaundromat;
}

export function getAnnualPricePerLaundromat(n: number): number {
  const monthly = getMonthlyPricePerLaundromat(n);
  return monthly * LAUNDROMAT_PRICING.annual.factor;
}

export function getTierLabel(n: number): string {
  if (n <= LAUNDROMAT_PRICING.monthly.tier1.max) return "Tarif palier 1–2 laveries";
  if (n <= LAUNDROMAT_PRICING.monthly.tier2.max) return "Tarif palier 3–5 laveries";
  return "Tarif palier 6+ laveries";
}

export function getLaundromatPricing(count: number) {
  const monthlyPricePerLav = getMonthlyPricePerLaundromat(count);
  const annualPricePerLav = getAnnualPricePerLaundromat(count);
  const monthlyTotal = count * monthlyPricePerLav;
  const annualTotal = count * annualPricePerLav;
  const annualSaving = (monthlyTotal * 12) - annualTotal;

  return {
    monthlyPricePerLav,
    annualPricePerLav,
    monthlyTotal,
    annualTotal,
    annualSaving,
    tierLabel: getTierLabel(count),
  };
}

// Tarifs FUTURS EXPLOITANTS : packs simulateur
export const SIMULATOR_PLANS = {
  simulator: {
    id: "simulator",
    name: "Pack Simulateur",
    description: "Accès au simulateur complet Lavcom Analytics Création",
    price: 79,
    billing: "mois" as const,
  },
  premium: {
    id: "premium",
    name: "Pack Premium",
    description: "Simulateur complet + 1h de visio avec un expert en gestion d'entreprise",
    price: 279,
    billing: "forfait" as const,
  },
};

export type SimulatorPlanId = keyof typeof SIMULATOR_PLANS;
