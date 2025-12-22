// ============================================
// CONFIGURATION STRIPE - PRIX SIMULATEUR
// ============================================

// Mapping des packs simulateur vers les price_id Stripe
export const SIMULATOR_STRIPE_PRICES = {
  essential: "price_prod_TeRGz196xsLhu8",
  project: "price_prod_TeRHGKJ3RLZCx7",
  comparator: "price_prod_TeRI4XlUIKnIai",
  premium: "price_prod_TeRJaGfH9iKnCa",
  // Options additionnelles
  add_project_1: "price_prod_TeRK9QLQ8aJntj",
  add_extension_30d: "price_prod_TeRKFnc9Z52LWS",
} as const;

export type SimulatorPriceKey = keyof typeof SIMULATOR_STRIPE_PRICES;

// Helper pour obtenir le price_id d'un pack
export function getStripePriceId(packId: string): string | undefined {
  return SIMULATOR_STRIPE_PRICES[packId as SimulatorPriceKey];
}
