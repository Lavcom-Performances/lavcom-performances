// ============================================
// STRIPE PRICE MAP - SOURCE DE VÉRITÉ (LIVE)
// ============================================
// Tous les price_id LIVE utilisés dans l'application
// Ne jamais utiliser de price_id test dans ce fichier

export const STRIPE_PRICES = {
  // ============================================
  // ABONNEMENTS LAVCOM PERFORMANCES (récurrents)
  // ============================================
  subscription: {
    tier1: {
      monthly: "price_1ShGd1B849ikvSjDddCJJA4c", // 29€/mois
      annual: "price_1ShGinB849ikvSjDbjYUTkdw",  // 290€/an
    },
    tier2: {
      monthly: "price_1ShGeVB849ikvSjD3LIR8UtE", // 25€/mois/laverie
      annual: "price_1ShGjEB849ikvSjD4VnQGXQO",  // 250€/an/laverie
    },
    tier3: {
      monthly: "price_1ShGetB849ikvSjDs2aIkeYS", // 21€/mois/laverie
      annual: "price_1ShGjaB849ikvSjDIWARPdI2",  // 210€/an/laverie
    },
  },

  // ============================================
  // PACKS SIMULATEUR (paiement unique)
  // ============================================
  simulator: {
    essential: "price_1Sh8OBB849ikvSjD4vraisPU",   // 79€ - 30 jours, 1 projet
    project: "price_1Sh8P9B849ikvSjD2wT6zlUp",     // 149€ - 90 jours, 3 projets
    comparator: "price_1Sh8Q0B849ikvSjDyDYUvewo",  // 229€ - 180 jours, 10 projets
    premium: "price_1Sh8QjB849ikvSjDvYjSHo57",     // 279€ - 90 jours, 3 projets + visios
  },

  // ============================================
  // ADD-ONS SIMULATEUR (paiement unique)
  // ============================================
  addon: {
    extension_30d: {
      essential: "price_1Sh8SIB849ikvSjD6XKmxDUP",   // 39€
      project: "price_1ShdNZB849ikvSjDFNIwsP7W",     // 59€
      comparator: "price_1ShdPqB849ikvSjDqaT6HxEK",  // 79€
    },
    project_plus1: {
      essential: "price_1Sh8RcB849ikvSjDFSw33u5y",   // 29€
      project: "price_1ShdWYB849ikvSjDxfYSBpi8",     // 39€
      comparator: "price_1ShdXNB849ikvSjDXhk7fmE5",  // 49€
    },
  },
} as const;

// ============================================
// CONFIGURATION DES PACKS SIMULATEUR
// ============================================
export const SIMULATOR_PACKS = {
  essential: { accessDays: 30, maxProjects: 1, amountTtc: 79 },
  project: { accessDays: 90, maxProjects: 3, amountTtc: 149 },
  comparator: { accessDays: 180, maxProjects: 10, amountTtc: 229 },
  premium: { accessDays: 90, maxProjects: 3, amountTtc: 279 },
} as const;

// ============================================
// CONFIGURATION DES ADD-ONS
// ============================================
export const ADDON_CONFIG = {
  extension_30d: { days: 30 },
  project_plus1: { projectsDelta: 1 },
} as const;

export const ADDON_PRICES_TTC = {
  extension_30d: {
    essential: 39,
    project: 59,
    comparator: 79,
  },
  project_plus1: {
    essential: 29,
    project: 39,
    comparator: 49,
  },
} as const;

// ============================================
// HELPER FUNCTIONS
// ============================================
export function getSubscriptionTier(laundryCount: number): "tier1" | "tier2" | "tier3" {
  if (laundryCount <= 2) return "tier1";
  if (laundryCount <= 5) return "tier2";
  return "tier3";
}

export function getSubscriptionPriceId(
  laundryCount: number,
  interval: "monthly" | "annual"
): string {
  const tier = getSubscriptionTier(laundryCount);
  return STRIPE_PRICES.subscription[tier][interval];
}

export type SimulatorPackId = keyof typeof SIMULATOR_PACKS;
export type AddonKind = keyof typeof ADDON_CONFIG;
export type AddonTier = "essential" | "project" | "comparator";
