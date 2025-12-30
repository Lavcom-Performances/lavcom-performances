/**
 * Normalize payment mode strings to standard format: CB, ESP, FI
 */

export const PAYMENT_MODES_ACCEPTED = ['CB', 'ESP', 'FI'] as const;
export type NormalizedPaymentMode = typeof PAYMENT_MODES_ACCEPTED[number];

const PAYMENT_MODE_MAP: Record<string, NormalizedPaymentMode> = {
  // CB variants
  'cb': 'CB',
  'carte': 'CB',
  'card': 'CB',
  'carte bancaire': 'CB',
  'credit card': 'CB',
  'debit card': 'CB',
  'bank card': 'CB',
  
  // ESP variants
  'esp': 'ESP',
  'cash': 'ESP',
  'especes': 'ESP',
  'espèces': 'ESP',
  'espece': 'ESP',
  'espèce': 'ESP',
  'liquide': 'ESP',
  'monnaie': 'ESP',
  
  // FI variants
  'fi': 'FI',
  'free': 'FI',
  'gratuit': 'FI',
  'fidelite': 'FI',
  'fidélité': 'FI',
  'loyalty': 'FI',
  'bonus': 'FI',
};

/**
 * Normalize a payment mode string to standard format
 * @param mode - Raw payment mode string
 * @returns Normalized payment mode (CB, ESP, FI) or null if not recognized
 */
export function normalizePaymentMode(mode: string | null | undefined): NormalizedPaymentMode | null {
  if (!mode) return null;
  
  const normalized = mode.toLowerCase().trim();
  
  // Direct lookup
  if (normalized in PAYMENT_MODE_MAP) {
    return PAYMENT_MODE_MAP[normalized];
  }
  
  // Check if already in standard format
  const upper = mode.toUpperCase().trim();
  if (PAYMENT_MODES_ACCEPTED.includes(upper as NormalizedPaymentMode)) {
    return upper as NormalizedPaymentMode;
  }
  
  return null;
}

/**
 * Check if a payment mode is valid (can be normalized)
 */
export function isValidPaymentMode(mode: string | null | undefined): boolean {
  return normalizePaymentMode(mode) !== null;
}
