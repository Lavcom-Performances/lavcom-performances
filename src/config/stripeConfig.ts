// ============================================
// CONFIGURATION STRIPE - PRIX SIMULATEUR
// ============================================

// Mapping des packs simulateur vers les price_id Stripe
export const SIMULATOR_STRIPE_PRICES = {
  essential: "price_1Sh8OBB849ikvSjD4vraisPU",
  project: "price_1Sh8P9B849ikvSjD2wT6zlUp",
  comparator: "price_1Sh8Q0B849ikvSjDyDYUvewo",
  premium: "price_1Sh8QjB849ikvSjDvYjSHo57",
  // Add-ons Extension 30j
  add_extension_30d_essential: "price_1Sh8SIB849ikvSjD6XKmxDUP",
  add_extension_30d_project: "price_1ShdNZB849ikvSjDFNIwsP7W",
  add_extension_30d_comparator: "price_1ShdPqB849ikvSjDqaT6HxEK",
  // Add-ons +1 Projet
  add_project_1_essential: "price_1Sh8RcB849ikvSjDFSw33u5y",
  add_project_1_project: "price_1ShdWYB849ikvSjDxfYSBpi8",
  add_project_1_comparator: "price_1ShdXNB849ikvSjDXhk7fmE5",
} as const;

export type SimulatorPriceKey = keyof typeof SIMULATOR_STRIPE_PRICES;

// Helper pour obtenir le price_id d'un pack
export function getStripePriceId(packId: string): string | undefined {
  return SIMULATOR_STRIPE_PRICES[packId as SimulatorPriceKey];
}
