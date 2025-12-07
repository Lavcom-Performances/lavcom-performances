// ============================================
// CONFIGURATION CENTRALISÉE DES TARIFS
// ============================================

import { translations } from "@/lib/i18n";

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
  const { tierLabels } = translations.pricing;
  if (n <= LAUNDROMAT_PRICING.monthly.tier1.max) return tierLabels.tier1;
  if (n <= LAUNDROMAT_PRICING.monthly.tier2.max) return tierLabels.tier2;
  return tierLabels.tier3;
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
    name: translations.subscribeSimulator.plans.simulator.title,
    description: translations.subscribeSimulator.plans.simulator.description,
    price: 79,
    billing: "mois" as const,
  },
  premium: {
    id: "premium",
    name: translations.subscribeSimulator.plans.premium.title,
    description: translations.subscribeSimulator.plans.premium.description,
    price: 279,
    billing: "forfait" as const,
  },
};

export type SimulatorPlanId = keyof typeof SIMULATOR_PLANS;
