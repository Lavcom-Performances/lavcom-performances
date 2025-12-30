/**
 * Business rules for CSV import transformations
 * 
 * TAEX-145: Fix rechargements ESP (topup cash)
 * Some ESP top-up lines have no "sale line": TYPE empty + PRIX=0, but INSERE>0.
 * These must be transformed to count in revenue.
 */

/**
 * Convert any value to number, handling French decimal comma
 */
function toNum(v: unknown): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return v;
  const s = String(v).trim().replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Normalize a string value
 */
function normStr(v: unknown): string {
  return (v ?? "").toString().trim();
}

/**
 * Normalize payment mode to standard codes
 */
function normMode(v: unknown): string {
  const m = normStr(v).toUpperCase();
  // Support alternate labels
  if (m === "ESPECES" || m === "CASH") return "ESP";
  if (m === "CARTE" || m === "CARD") return "CB";
  return m;
}

/**
 * Operation row structure for business rules
 */
export interface OperationForBusinessRules {
  payment_mode?: string | null;
  type?: string | null;
  inserted_eur?: number | null;
  price_eur?: number | null;
  price_esp?: number | null;
  price_cb?: number | null;
  amount?: number | null;
  change_eur?: number | null;
}

/**
 * Result of applying business rules
 */
export interface BusinessRulesResult {
  operation: OperationForBusinessRules;
  rechEspFixed: boolean;
}

/**
 * Apply business rules to transform operations before DB insert
 * 
 * Rule: Rech ESP (ESP top-up without sale line)
 * If MODE = 'ESP' AND TYPE is empty AND INSERE > 0 AND PRIX = 0 AND PRIX_ESP = 0
 * Then: TYPE = 'Rech ESP', PRIX = INSERE, PRIX_ESP = INSERE
 * 
 * @param op The operation to transform
 * @returns The transformed operation and flags indicating what rules were applied
 */
export function applyBusinessRules(op: OperationForBusinessRules): BusinessRulesResult {
  const mode = normMode(op.payment_mode);
  const type = normStr(op.type);
  const insere = toNum(op.inserted_eur);
  const prix = toNum(op.price_eur);
  const prixEsp = toNum(op.price_esp);
  const prixCb = toNum(op.price_cb);
  const amount = toNum(op.amount);

  let rechEspFixed = false;

  // Rule: Rech ESP - ESP top-up line without sale (prix=0) => transform to sale
  // Conditions:
  // - Payment mode is ESP
  // - Type is empty
  // - Inserted amount > 0
  // - Price is 0 or empty
  // - Price ESP is 0 or empty
  // - Price CB is 0 (guard against CB top-ups)
  const isRechEspCandidate =
    mode === "ESP" &&
    type === "" &&
    insere > 0 &&
    prix === 0 &&
    prixEsp === 0 &&
    prixCb === 0 &&
    (amount === 0 || amount === insere); // amount should be 0 or equal to insere

  if (isRechEspCandidate) {
    op.type = "Rech ESP";
    op.price_eur = insere;
    op.price_esp = insere;
    op.amount = insere;
    rechEspFixed = true;
  }

  return {
    operation: op,
    rechEspFixed,
  };
}

/**
 * Apply business rules to an array of operations
 * 
 * @param operations Array of operations to transform
 * @returns Object with transformed operations and count of rules applied
 */
export function applyBusinessRulesToBatch<T extends OperationForBusinessRules>(
  operations: T[]
): {
  operations: T[];
  rechEspFixedCount: number;
} {
  let rechEspFixedCount = 0;

  const transformedOps = operations.map(op => {
    const result = applyBusinessRules(op);
    if (result.rechEspFixed) {
      rechEspFixedCount++;
    }
    return op; // op is mutated in place
  });

  return {
    operations: transformedOps,
    rechEspFixedCount,
  };
}
