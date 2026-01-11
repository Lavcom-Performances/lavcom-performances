/**
 * Utility functions to filter operations consistently across the application.
 * 
 * BUSINESS RULES:
 * - Rechargements (machine contains "rech") are NOT sales - they reload a loyalty card
 * - Only CB and ESP operations count towards revenue (FI uses prepaid balance)
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
 * Check if an operation should be counted in revenue calculations.
 * Excludes: rechargements, annulations, remboursements
 */
export function isCountedInRevenue(op: OperationForFilter): boolean {
  // Exclude rechargements
  if (isRechargement(op)) return false;
  
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
 */
export function isFIPayment(op: OperationForFilter): boolean {
  return op.payment_mode?.toUpperCase() === 'FI';
}

/**
 * Filter operations to only include those counted in revenue.
 */
export function filterRevenueOperations<T extends OperationForFilter>(operations: T[]): T[] {
  return operations.filter(isCountedInRevenue);
}

/**
 * Calculate revenue stats from operations, excluding rechargements.
 */
export function calculateRevenueStats(operations: OperationForFilter[]) {
  const salesOps = filterRevenueOperations(operations);
  
  const total = salesOps.reduce((sum, op) => sum + Number(op.amount || 0), 0);
  const cb = salesOps.filter(isCBPayment).reduce((sum, op) => sum + Number(op.amount || 0), 0);
  const esp = salesOps.filter(isESPPayment).reduce((sum, op) => sum + Number(op.amount || 0), 0);
  const fi = salesOps.filter(isFIPayment).reduce((sum, op) => sum + Number(op.amount || 0), 0);
  
  return {
    total,
    cb,
    esp,
    fi,
    transactions: salesOps.length,
    cbTransactions: salesOps.filter(isCBPayment).length,
    espTransactions: salesOps.filter(isESPPayment).length,
    fiTransactions: salesOps.filter(isFIPayment).length,
    avgBasket: salesOps.length > 0 ? total / salesOps.length : 0,
  };
}
