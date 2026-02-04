/**
 * TAEX-301: Operation Category Classification
 * 
 * Taxonomy: CYCLE | PRODUCT | OPTION
 * 
 * - CYCLE: Machine usage (washers, dryers)
 * - PRODUCT: Detergent, softener sales
 * - OPTION: Cycle options (pre-wash, extra rinse)
 */

export type OperationCategory = 'CYCLE' | 'PRODUCT' | 'OPTION';

/**
 * Keywords for category detection
 */
const CYCLE_KEYWORDS = [
  'lave-linge', 'lavelinge', 'lave linge',
  'séchoir', 'sécheuse', 'seche-linge', 'sechelinge',
  'dryer', 'washer', 'machine',
  'kg', // Weight indicator (e.g., "14kg")
];

const PRODUCT_KEYWORDS = [
  'lessive', 'assouplissant', 'savon', 'produit',
  'détergent', 'detergent', 'softener', 'soap',
  'adoucissant', 'javel', 'désinfectant',
];

const OPTION_KEYWORDS = [
  'prélavage', 'prelavage', 'rinçage', 'rincage',
  'séchage long', 'séchage court', 'sechage',
  'démarrage', 'demarrage', 'essorage',
  'option', 'extra', 'supplément',
];

/**
 * Classify an operation based on its description/machine fields
 * 
 * @param description - Program/description field
 * @param machine - Machine name field (optional)
 * @returns Operation category
 */
export function classifyOperationCategory(
  description?: string | null,
  machine?: string | null
): OperationCategory {
  const text = (
    (description ?? '') + ' ' + (machine ?? '')
  ).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Check PRODUCT first (most specific)
  if (PRODUCT_KEYWORDS.some(kw => text.includes(kw.normalize('NFD').replace(/[\u0300-\u036f]/g, '')))) {
    return 'PRODUCT';
  }
  
  // Check OPTION next
  if (OPTION_KEYWORDS.some(kw => text.includes(kw.normalize('NFD').replace(/[\u0300-\u036f]/g, '')))) {
    return 'OPTION';
  }
  
  // Check CYCLE keywords
  if (CYCLE_KEYWORDS.some(kw => text.includes(kw.normalize('NFD').replace(/[\u0300-\u036f]/g, '')))) {
    return 'CYCLE';
  }
  
  // Default to CYCLE (most common operation type)
  return 'CYCLE';
}

/**
 * Get display label for category
 */
export function getCategoryLabel(category: OperationCategory): string {
  switch (category) {
    case 'CYCLE':
      return 'Cycle machine';
    case 'PRODUCT':
      return 'Produit';
    case 'OPTION':
      return 'Option';
    default:
      return 'Inconnu';
  }
}

/**
 * Get category color for UI badges
 */
export function getCategoryColor(category: OperationCategory): string {
  switch (category) {
    case 'CYCLE':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    case 'PRODUCT':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    case 'OPTION':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

/**
 * Check if category should be included in machine KPIs
 */
export function isIncludedInMachineKpis(category: OperationCategory): boolean {
  return category === 'CYCLE';
}

/**
 * Check if category should be included in revenue
 */
export function isIncludedInRevenue(category: OperationCategory): boolean {
  // All categories contribute to total revenue
  return true;
}

export default {
  classifyOperationCategory,
  getCategoryLabel,
  getCategoryColor,
  isIncludedInMachineKpis,
  isIncludedInRevenue,
};
