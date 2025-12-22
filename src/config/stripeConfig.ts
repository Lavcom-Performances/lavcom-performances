// ============================================
// CONFIGURATION STRIPE - PRIX SIMULATEUR
// ============================================

// Mapping des packs simulateur vers les price_id Stripe
export const SIMULATOR_STRIPE_PRICES = {
  essential: "price_1Sh8OBB849ikvSjD4vraisPU",
  project: "price_1Sh8P9B849ikvSjD2wT6zlUp",
  comparator: "price_1Sh8Q0B849ikvSjDyDYUvewo",
  premium: "price_1Sh8Q0B849ikvSjDyDYUvewo",
  // Options additionnelles
  add_project_1: "price_1Sh8RcB849ikvSjDFSw33u5y",
  add_extension_30d: "price_1Sh8SIB849ikvSjD6XKmxDUP",
} as const;

export type SimulatorPriceKey = keyof typeof SIMULATOR_STRIPE_PRICES;

// Helper pour obtenir le price_id d'un pack
export function getStripePriceId(packId: string): string | undefined {
  return SIMULATOR_STRIPE_PRICES[packId as SimulatorPriceKey];
}
