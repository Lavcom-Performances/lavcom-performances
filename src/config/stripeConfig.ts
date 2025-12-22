// ============================================
// CONFIGURATION STRIPE - PRIX SIMULATEUR
// ============================================

// Mapping des packs simulateur vers les price_id Stripe
export const SIMULATOR_STRIPE_PRICES = {
  essential: "price_...",
  project: "price_...",
  comparator: "price_...",
  premium: "price_...",
  // Options additionnelles
  add_project_1: "price_...",
  add_extension_30d: "price_...",
} as const;

export type SimulatorPriceKey = keyof typeof SIMULATOR_STRIPE_PRICES;

// Helper pour obtenir le price_id d'un pack
export function getStripePriceId(packId: string): string | undefined {
  return SIMULATOR_STRIPE_PRICES[packId as SimulatorPriceKey];
}
