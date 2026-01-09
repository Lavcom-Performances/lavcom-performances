// ============================================
// SALE PRICE UTILITIES - Classification + Labels
// ============================================
import { STRIPE_PRICES } from './stripePriceMap';

type SaleType = 'subscription' | 'addon' | 'simulator' | 'unknown';

// Build reverse lookup from price_id to type
const priceIdToType: Record<string, SaleType> = {};
const priceIdToLabel: Record<string, string> = {};

// Subscription prices
Object.entries(STRIPE_PRICES.subscription).forEach(([tier, intervals]) => {
  Object.entries(intervals).forEach(([interval, priceId]) => {
    priceIdToType[priceId] = 'subscription';
    const tierLabel = tier === 'tier1' ? '1-2 laveries' : tier === 'tier2' ? '3-5 laveries' : '6+ laveries';
    const intervalLabel = interval === 'monthly' ? 'Mensuel' : 'Annuel';
    priceIdToLabel[priceId] = `Abonnement ${intervalLabel} (${tierLabel})`;
  });
});

// Simulator packs
Object.entries(STRIPE_PRICES.simulator).forEach(([packId, priceId]) => {
  priceIdToType[priceId] = 'simulator';
  const packLabels: Record<string, string> = {
    essential: 'Pack Essentiel',
    project: 'Pack Projet',
    comparator: 'Pack Comparateur',
    premium: 'Pack Premium',
  };
  priceIdToLabel[priceId] = packLabels[packId] || `Simulateur ${packId}`;
});

// Add-ons
Object.entries(STRIPE_PRICES.addon).forEach(([addonKind, tiers]) => {
  Object.entries(tiers).forEach(([tier, priceId]) => {
    priceIdToType[priceId] = 'addon';
    const kindLabel = addonKind === 'extension_30d' ? 'Extension 30j' : 'Projet supplémentaire';
    const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);
    priceIdToLabel[priceId] = `${kindLabel} (${tierLabel})`;
  });
});

/**
 * Classify a sale by its price_id
 */
export function classifySaleType(priceId: string | null | undefined): SaleType {
  if (!priceId) return 'unknown';
  return priceIdToType[priceId] || 'unknown';
}

/**
 * Get a human-readable label for a price_id
 */
export function labelForPrice(priceId: string | null | undefined): string {
  if (!priceId) return 'Inconnu';
  return priceIdToLabel[priceId] || priceId;
}

/**
 * Get all price IDs for a given sale type
 */
export function getPriceIdsForType(type: SaleType): string[] {
  return Object.entries(priceIdToType)
    .filter(([, t]) => t === type)
    .map(([priceId]) => priceId);
}

/**
 * Format cents to euros
 */
export function formatCentsToEuros(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return '—';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100);
}
