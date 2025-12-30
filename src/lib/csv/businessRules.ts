/**
 * Business rules for CSV import transformations
 * 
 * TAEX-145: Fix rechargements ESP (topup cash)
 * - CSV amounts are in CENTIMES
 * - All DB amounts must be in EUROS
 * - ESP top-up lines with no sale must be transformed to count in revenue
 */

/**
 * Normalize a string value (trim whitespace)
 */
export function normStr(v: unknown): string {
  return (v ?? "").toString().trim();
}

/**
 * Normalize payment mode to standard codes
 */
export function normMode(v: unknown): string {
  const m = normStr(v).toUpperCase();
  // Support alternate labels
  if (m === "ESPECES" || m === "CASH") return "ESP";
  if (m === "CARTE" || m === "CARD") return "CB";
  return m;
}

/**
 * Convert centimes to euros
 * Accepts: number (centimes), "2000", "2 000", "2000,00"
 * Returns: euros as number (e.g., 2000 => 20.00)
 */
export function centsToEurosValue(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return Math.round(v) / 100;
  const s = String(v).trim().replace(/\s/g, "").replace(",", ".");
  const n = Number(s);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n) / 100;
}

/**
 * Round to 2 decimal places for euro amounts
 */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Operation row structure with raw centimes values
 */
export interface OperationRowRaw {
  mode?: string | null;
  type?: string | null;
  insere?: unknown; // centimes
  prix?: unknown;   // centimes
  rendu?: unknown;  // centimes
  prix_cb?: unknown; // centimes
  prix_esp?: unknown; // centimes
}

/**
 * Operation row structure with normalized euro values
 */
export interface OperationRowNormalized {
  mode?: string | null;
  type?: string | null;
  insere_eur: number;
  prix_eur: number;
  rendu_eur: number;
  prix_cb_eur: number;
  prix_esp_eur: number;
}

/**
 * Result of normalizing and applying business rules
 */
export interface BusinessRulesResult {
  operation: OperationRowNormalized;
  rechEspFixed: boolean;
}

/**
 * Convert all money fields from centimes to euros
 * 
 * @param op Raw operation with amounts in centimes
 * @returns Normalized operation with amounts in euros
 */
export function normalizeMoneyToEuros(op: OperationRowRaw): OperationRowNormalized {
  return {
    mode: op.mode,
    type: op.type,
    insere_eur: round2(centsToEurosValue(op.insere)),
    prix_eur: round2(centsToEurosValue(op.prix)),
    rendu_eur: round2(centsToEurosValue(op.rendu)),
    prix_cb_eur: round2(centsToEurosValue(op.prix_cb)),
    prix_esp_eur: round2(centsToEurosValue(op.prix_esp)),
  };
}

/**
 * Apply Rech ESP business rule
 * 
 * Rule: If MODE='ESP', TYPE empty, INSERE>0, PRIX=0, PRIX_ESP=0
 * Then: TYPE='Rech ESP', PRIX=INSERE, PRIX_ESP=INSERE
 * 
 * @param op Normalized operation (amounts already in euros)
 * @returns Whether the rule was applied
 */
export function applyRechEspRule(op: OperationRowNormalized): boolean {
  const mode = normMode(op.mode);
  const type = normStr(op.type);
  const insere = op.insere_eur;
  const prix = op.prix_eur;
  const prixEsp = op.prix_esp_eur;
  const prixCb = op.prix_cb_eur;

  // Conditions for ESP top-up without sale line
  const isRechEspCandidate =
    mode === "ESP" &&
    type === "" &&
    insere > 0 &&
    prix === 0 &&
    prixEsp === 0 &&
    prixCb === 0;

  if (isRechEspCandidate) {
    op.type = "Rech ESP";
    op.prix_eur = insere;
    op.prix_esp_eur = insere;
    return true;
  }

  return false;
}

/**
 * Full pipeline: normalize centimes to euros, then apply business rules
 * 
 * @param rawOp Raw operation with amounts in centimes
 * @returns Normalized operation with business rules applied, plus flags
 */
export function processOperationForImport(rawOp: OperationRowRaw): BusinessRulesResult {
  const normalized = normalizeMoneyToEuros(rawOp);
  const rechEspFixed = applyRechEspRule(normalized);
  
  return {
    operation: normalized,
    rechEspFixed,
  };
}

// =============================================================================
// Legacy interface for backward compatibility
// =============================================================================

/**
 * @deprecated Use processOperationForImport instead
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
 * @deprecated Use processOperationForImport instead
 * Legacy function for backward compatibility
 */
export function applyBusinessRules(op: OperationForBusinessRules): { operation: OperationForBusinessRules; rechEspFixed: boolean } {
  const mode = normMode(op.payment_mode);
  const type = normStr(op.type);
  const insere = op.inserted_eur ?? 0;
  const prix = op.price_eur ?? 0;
  const prixEsp = op.price_esp ?? 0;
  const prixCb = op.price_cb ?? 0;
  const amount = op.amount ?? 0;

  let rechEspFixed = false;

  const isRechEspCandidate =
    mode === "ESP" &&
    type === "" &&
    insere > 0 &&
    prix === 0 &&
    prixEsp === 0 &&
    prixCb === 0 &&
    (amount === 0 || amount === insere);

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
