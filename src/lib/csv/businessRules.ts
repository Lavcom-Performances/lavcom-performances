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
 * Round to 2 decimal places for euro amounts
 */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Parse a raw value to a number
 */
function parseToNumber(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return v;
  const s = String(v).trim().replace(/\s/g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Detect if amounts are in centimes (values >= 1000 indicate centimes)
 * 
 * @param values Array of raw amount values to check
 * @returns true if amounts appear to be in centimes
 */
export function detectCentimes(values: unknown[]): boolean {
  const numbers = values.map(parseToNumber).filter(n => n > 0);
  if (numbers.length === 0) return false;
  
  // If any value >= 1000, assume centimes
  // (a laundry transaction of 1000€ is extremely unlikely)
  return numbers.some(n => n >= 1000);
}

/**
 * Convert centimes to euros if needed
 * Uses automatic detection: if value >= 1000, assumes centimes
 * 
 * @param v Raw value (may be centimes or euros)
 * @param forceCentimes If true, always treat as centimes
 * @returns Value in euros
 */
export function smartConvertToEuros(v: unknown, forceCentimes: boolean = false): number {
  const n = parseToNumber(v);
  if (n === 0) return 0;
  
  // If forced or value >= 1000, treat as centimes
  if (forceCentimes || n >= 1000) {
    return round2(n / 100);
  }
  
  return round2(n);
}

/**
 * Convert centimes to euros (legacy - always divides by 100)
 * @deprecated Use smartConvertToEuros for automatic detection
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
  centimesDetected: boolean;
}

/**
 * Convert all money fields from centimes to euros (legacy - always converts)
 * @deprecated Use normalizeMoneyWithDetection for automatic detection
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
 * Convert all money fields with automatic centimes detection
 * 
 * @param op Raw operation with amounts (may be centimes or euros)
 * @param forceCentimes If true, always treat as centimes
 * @returns Normalized operation with amounts in euros + detection flag
 */
export function normalizeMoneyWithDetection(
  op: OperationRowRaw, 
  forceCentimes: boolean = false
): { normalized: OperationRowNormalized; centimesDetected: boolean } {
  // Collect all money values to check for centimes
  const values = [op.insere, op.prix, op.rendu, op.prix_cb, op.prix_esp];
  const centimesDetected = forceCentimes || detectCentimes(values);
  
  const normalized: OperationRowNormalized = {
    mode: op.mode,
    type: op.type,
    insere_eur: smartConvertToEuros(op.insere, centimesDetected),
    prix_eur: smartConvertToEuros(op.prix, centimesDetected),
    rendu_eur: smartConvertToEuros(op.rendu, centimesDetected),
    prix_cb_eur: smartConvertToEuros(op.prix_cb, centimesDetected),
    prix_esp_eur: smartConvertToEuros(op.prix_esp, centimesDetected),
  };
  
  return { normalized, centimesDetected };
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
 * Full pipeline: normalize money (with auto-detection) then apply business rules
 * 
 * @param rawOp Raw operation with amounts (may be centimes or euros)
 * @param forceCentimes If true, always treat as centimes
 * @returns Normalized operation with business rules applied, plus flags
 */
export function processOperationForImport(
  rawOp: OperationRowRaw, 
  forceCentimes: boolean = false
): BusinessRulesResult {
  const { normalized, centimesDetected } = normalizeMoneyWithDetection(rawOp, forceCentimes);
  const rechEspFixed = applyRechEspRule(normalized);
  
  return {
    operation: normalized,
    rechEspFixed,
    centimesDetected,
  };
}

/**
 * Batch detection: check if a batch of operations contains centimes
 * Useful for detecting the format of an entire CSV file
 * 
 * @param operations Array of raw operations
 * @returns true if any operation appears to have centimes values
 */
export function detectBatchCentimes(operations: OperationRowRaw[]): boolean {
  const allValues: unknown[] = [];
  
  for (const op of operations) {
    allValues.push(op.insere, op.prix, op.rendu, op.prix_cb, op.prix_esp);
  }
  
  return detectCentimes(allValues);
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
