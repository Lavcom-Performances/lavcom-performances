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

// Tarifs FUTURS EXPLOITANTS : packs simulateur (accès limité dans le temps)
export interface SimulatorPack {
  id: string;
  price: number;
  accessDays: number;
  projectsIncluded: number;
  hasExpertCalls?: boolean;
  expertCallsCount?: number;
  isRecommended?: boolean;
}

export const SIMULATOR_PACKS: SimulatorPack[] = [
  {
    id: "essential",
    price: 79,
    accessDays: 30,
    projectsIncluded: 1,
  },
  {
    id: "project",
    price: 149,
    accessDays: 90,
    projectsIncluded: 3,
    isRecommended: true,
  },
  {
    id: "comparator",
    price: 229,
    accessDays: 180,
    projectsIncluded: 10,
  },
  {
    id: "premium",
    price: 279,
    accessDays: 90,
    projectsIncluded: 3,
    hasExpertCalls: true,
    expertCallsCount: 2,
  },
];

// Helper pour obtenir un pack par son ID
export function getSimulatorPackById(id: string): SimulatorPack | undefined {
  return SIMULATOR_PACKS.find(pack => pack.id === id);
}

// ============================================
// ADD-ONS SIMULATEUR (Options ponctuelles)
// ============================================

export interface SimulatorAddon {
  id: string;
  kind: "extension_30d" | "project_plus1";
  days?: number;
  projectsDelta?: number;
}

export interface SimulatorAddonPricing {
  tier: string;
  price: number;
  disabled?: boolean;
  disabledReason?: string;
}

// Configuration des add-ons
export const SIMULATOR_ADDONS: SimulatorAddon[] = [
  {
    id: "extension_30d",
    kind: "extension_30d",
    days: 30,
  },
  {
    id: "project_plus1",
    kind: "project_plus1",
    projectsDelta: 1,
  },
];

// Pricing différencié par tier pour les add-ons
export const ADDON_PRICING: Record<string, SimulatorAddonPricing[]> = {
  extension_30d: [
    { tier: "essential", price: 39 },
    { tier: "project", price: 59 },
    { tier: "comparator", price: 79 },
  ],
  project_plus1: [
    { tier: "essential", price: 29 },
    { tier: "project", price: 39 },
    { tier: "comparator", price: 0, disabled: true, disabledReason: "Déjà inclus (10 projets)" },
  ],
};

// Helper pour obtenir le prix d'un add-on pour un tier donné
export function getAddonPrice(addonKind: string, tier: string): SimulatorAddonPricing | undefined {
  return ADDON_PRICING[addonKind]?.find(p => p.tier === tier);
}

// Helper pour déterminer le tier à partir du plan_code actuel
export function getTierFromPlanCode(planCode: string | null): string {
  if (!planCode) return "essential";
  if (planCode.includes("comparator")) return "comparator";
  if (planCode.includes("project") || planCode.includes("premium")) return "project";
  return "essential";
}

// Anciens packs (conservés pour compatibilité, mais dépréciés)
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
export type SimulatorPackId = SimulatorPack["id"];
export type SimulatorAddonKind = SimulatorAddon["kind"];
