// ============================================
// TAEX-308: OFFICIAL COMMERCIAL PLAN STRUCTURE
// ============================================
// Source of truth for all Lavcom Performances plans
// No hidden features, no ambiguity

import { LAUNDROMAT_PRICING, getMonthlyPricePerLaundromat, getAnnualPricePerLaundromat } from "./pricingConfig";

// ============================================
// PLAN TYPES
// ============================================
export type PlanType = "starter" | "advanced" | "project";
export type BillingInterval = "monthly" | "annual";

// ============================================
// PLAN DEFINITIONS (No ambiguity)
// ============================================
export interface PlanDefinition {
  id: PlanType;
  name: string;
  target: string;
  description: string;
  features: string[];
  pricing: {
    type: "per_laundromat" | "time_based";
    interval?: BillingInterval;
    basePrice?: number; // For time-based plans
    tierPrices?: {
      tier1: number; // 1-2 laundromats
      tier2: number; // 3-5 laundromats
      tier3: number; // 6+ laundromats
    };
  };
  isOperational: boolean; // true = SaaS exploitants, false = simulator
}

export const COMMERCIAL_PLANS: Record<PlanType, PlanDefinition> = {
  starter: {
    id: "starter",
    name: "Starter",
    target: "1–2 laveries",
    description: "Pour les exploitants débutants ou avec une seule laverie",
    features: [
      "Import CSV illimité",
      "Tableau de bord KPIs",
      "Objectifs et comparaisons",
      "Exports CSV et PDF",
      "Data Trust Score",
      "Support email",
    ],
    pricing: {
      type: "per_laundromat",
      tierPrices: {
        tier1: LAUNDROMAT_PRICING.monthly.tier1.pricePerLaundromat, // 29€
        tier2: LAUNDROMAT_PRICING.monthly.tier1.pricePerLaundromat, // 29€ (stays at tier1 for starter)
        tier3: LAUNDROMAT_PRICING.monthly.tier1.pricePerLaundromat,
      },
    },
    isOperational: true,
  },
  advanced: {
    id: "advanced",
    name: "Multi-sites",
    target: "3+ laveries",
    description: "Pour les opérateurs multi-sites avec besoins avancés",
    features: [
      "Tout ce qui est inclus dans Starter",
      "Comparaison multi-sites",
      "Exports avancés",
      "Tableaux de bord consolidés",
      "Support prioritaire",
    ],
    pricing: {
      type: "per_laundromat",
      tierPrices: {
        tier1: LAUNDROMAT_PRICING.monthly.tier1.pricePerLaundromat, // 29€
        tier2: LAUNDROMAT_PRICING.monthly.tier2.pricePerLaundromat, // 25€
        tier3: LAUNDROMAT_PRICING.monthly.tier3.pricePerLaundromat, // 21€
      },
    },
    isOperational: true,
  },
  project: {
    id: "project",
    name: "Projet / Simulation",
    target: "Futurs exploitants, banquiers, comptables",
    description: "Projections financières pour créations ou reprises",
    features: [
      "Simulateur financier complet",
      "Exports PDF qualité bancaire",
      "Multi-scénarios",
      "Pas de KPIs opérationnels",
    ],
    pricing: {
      type: "time_based",
      basePrice: 79, // Starting pack price
    },
    isOperational: false,
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get the effective price per laundromat for a given plan and count
 */
export function getPlanPricePerLaundromat(
  planType: PlanType,
  laundromatCount: number,
  interval: BillingInterval = "monthly"
): number {
  const plan = COMMERCIAL_PLANS[planType];
  
  if (plan.pricing.type === "time_based") {
    return 0; // Not per-laundromat pricing
  }

  const prices = plan.pricing.tierPrices!;
  let price: number;

  if (laundromatCount <= 2) {
    price = prices.tier1;
  } else if (laundromatCount <= 5) {
    price = prices.tier2;
  } else {
    price = prices.tier3;
  }

  if (interval === "annual") {
    // 10 months paid, 2 free (≈17% discount)
    return price * LAUNDROMAT_PRICING.annual.factor / 12;
  }

  return price;
}

/**
 * Get total monthly cost for a given plan and laundromat count
 */
export function getPlanTotalMonthly(
  planType: PlanType,
  laundromatCount: number
): number {
  const pricePerLav = getPlanPricePerLaundromat(planType, laundromatCount, "monthly");
  return pricePerLav * laundromatCount;
}

/**
 * Determine which plan tier applies based on laundromat count
 */
export function getApplicablePlan(laundromatCount: number): PlanType {
  if (laundromatCount <= 2) return "starter";
  return "advanced";
}

/**
 * Get tier label for display
 */
export function getPlanTierLabel(laundromatCount: number): string {
  if (laundromatCount <= 2) return "1–2 laveries";
  if (laundromatCount <= 5) return "3–5 laveries";
  return "6+ laveries";
}

// ============================================
// BETA TRANSITION RULES
// ============================================
export const BETA_TRANSITION = {
  advanceNoticeDays: 7, // Show banner 7 days before end
  betaPriceCents: 900, // 9€/month during beta
  standardPriceCents: 2900, // 29€/month after beta
  transitionMessage: {
    fr: "Votre période bêta se termine bientôt. Le tarif standard s'appliquera automatiquement, sans perte de données ni de fonctionnalités.",
  },
} as const;

// ============================================
// COMMERCIAL MESSAGING RULES
// ============================================
export const COMMERCIAL_MESSAGING = {
  // Replace "Beta" with professional language
  terminology: {
    deprecated: ["Beta", "Bêta", "Version bêta"],
    preferred: {
      platform: "Plateforme professionnelle",
      tool: "Outil d'aide à la décision",
      projections: "Projections qualité bancaire",
    },
  },
  // In-app message rules
  rules: {
    factual: true,
    short: true,
    noOversell: true,
    noCountdownPressure: true,
    noModalBlocking: true,
  },
} as const;

// ============================================
// EXIT RULES (No lock-in, no dark patterns)
// ============================================
export const EXIT_RULES = {
  allowDataExport: true,
  keepAccessUntilPeriodEnd: true,
  noLockIn: true,
  noDarkPatterns: true,
  trustMessage: "Un utilisateur qui part doit toujours faire confiance à Lavcom.",
} as const;
