/**
 * Utility functions to filter operations consistently across the application.
 * 
 * BUSINESS RULES:
 * - Rechargements (machine contains "rech") are NOT sales - they reload a loyalty card
 * - Only CB and ESP operations count towards revenue (CA)
 * - FI (Fidélité) payments are NOT counted in CA - they use prepaid balance
 *   (the revenue was already counted when the card was recharged)
 * - Ventes = actual machine usage (lave-linge, sèche-linge, lessive)
 */

export interface OperationForFilter {
  machine?: string | null;
  machine_name?: string | null;
  payment_mode?: string | null;
  type?: string | null;
  amount?: number;
}

/**
 * Check if an operation is a rechargement (card reload), not a sale.
 * Rechargements should be excluded from revenue calculations.
 */
export function isRechargement(op: OperationForFilter): boolean {
  const machine = (op.machine || op.machine_name || '').toLowerCase();
  return machine.includes('rech');
}

/**
 * Check if an operation is a CB (card) payment.
 */
export function isCBPayment(op: OperationForFilter): boolean {
  return op.payment_mode?.toUpperCase() === 'CB';
}

/**
 * Check if an operation is an ESP (cash) payment.
 */
export function isESPPayment(op: OperationForFilter): boolean {
  return op.payment_mode?.toUpperCase() === 'ESP';
}

/**
 * Check if an operation is an FI (loyalty) payment.
 * FI payments use prepaid balance and should NOT count towards CA.
 */
export function isFIPayment(op: OperationForFilter): boolean {
  const mode = op.payment_mode?.toUpperCase();
  return mode === 'FI' || mode === 'FIDELITE' || mode === 'FIDÉLITÉ';
}

/**
 * Check if an operation should be counted in revenue (CA) calculations.
 * 
 * EXCLUDES:
 * - Rechargements (card reloads)
 * - Annulations/Remboursements
 * - FI payments (uses prepaid balance, CA was counted at rechargement time)
 */
export function isCountedInRevenue(op: OperationForFilter): boolean {
  // Exclude rechargements
  if (isRechargement(op)) return false;
  
  // Exclude FI payments - they don't count as new revenue
  if (isFIPayment(op)) return false;
  
  // Exclude based on type if available
  const typeValue = (op.type || '').toLowerCase();
  if (
    typeValue.includes('annulation') ||
    typeValue.includes('remboursement') ||
    typeValue.includes('crédit') ||
    typeValue.includes('credit')
  ) {
    return false;
  }
  
  return true;
}

/**
 * Filter operations to only include those counted in revenue (CA).
 * Excludes: rechargements, FI payments, annulations, remboursements
 */
export function filterRevenueOperations<T extends OperationForFilter>(operations: T[]): T[] {
  return operations.filter(isCountedInRevenue);
}

/**
 * Calculate revenue stats from operations.
 * 
 * IMPORTANT: 
 * - CA total = CB + ESP only (excludes FI)
 * - FI is tracked separately for informational purposes
 */
export function calculateRevenueStats(operations: OperationForFilter[]) {
  // First filter out rechargements, annulations, etc.
  const validOps = operations.filter(op => {
    if (isRechargement(op)) return false;
    const typeValue = (op.type || '').toLowerCase();
    if (
      typeValue.includes('annulation') ||
      typeValue.includes('remboursement') ||
      typeValue.includes('crédit') ||
      typeValue.includes('credit')
    ) {
      return false;
    }
    return true;
  });
  
  // Calculate by payment mode
  const cb = validOps.filter(isCBPayment).reduce((sum, op) => sum + Number(op.amount || 0), 0);
  const esp = validOps.filter(isESPPayment).reduce((sum, op) => sum + Number(op.amount || 0), 0);
  const fi = validOps.filter(isFIPayment).reduce((sum, op) => sum + Number(op.amount || 0), 0);
  
  // CA = CB + ESP only (FI excluded)
  const total = cb + esp;
  
  // Revenue operations = CB + ESP only
  const revenueOps = validOps.filter(op => isCBPayment(op) || isESPPayment(op));
  
  return {
    total,      // CA = CB + ESP (excludes FI)
    cb,
    esp,
    fi,         // Tracked separately, NOT included in total
    transactions: revenueOps.length,
    cbTransactions: validOps.filter(isCBPayment).length,
    espTransactions: validOps.filter(isESPPayment).length,
    fiTransactions: validOps.filter(isFIPayment).length,
    avgBasket: revenueOps.length > 0 ? total / revenueOps.length : 0,
  };
}
