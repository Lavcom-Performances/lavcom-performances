/**
 * TAEX-319: Unified CSV Parser
 * 
 * Step 1 — New entry point that:
 * 1. Detects provider via adapterRegistry (or fallback isWiLine/isLmControl)
 * 2. Delegates to the correct parser
 * 3. For WiLine: fixes machine field to be description-only (no selection prefix)
 *    so that downstream category detection (getCategorieFromName, ILIKE) works.
 * 
 * CRITICAL INVARIANT (non-negotiable):
 *   WiLine machine = description only, e.g. "Séchoirs 13kg"
 *   Selection number → metadata_raw.selection only
 *   If machine = "22 - Séchoirs 13kg" → categorie = AUTRE → DTS v1 broken
 * 
 * This file does NOT modify parseMultiCsv.ts, parseWiLine.ts, or any existing file.
 */

import { MultiCsvParsedRow } from './multiCsvTypes';
import { parseMultiCsvFile } from './parseMultiCsv';
import { parseWiLineCsvFile, WiLineParsedRow } from './parseWiLine';
import { adapterRegistry, parseHeadersFromContent } from './adapters/index';

/**
 * Unified CSV parser entry point.
 * 
 * Detects provider from content headers via the adapter registry,
 * delegates to the appropriate parser, then normalises the output
 * so that every row's `machine` field contains only the description
 * (for WiLine) — never "selection - description".
 */
export function parseUnifiedCsvFile(
  filename: string,
  content: string
): MultiCsvParsedRow[] {
  // --- 1. Detect provider via adapter registry ---
  const headers = parseHeadersFromContent(content);
  const adapter = adapterRegistry.detectAdapter(headers);
  const detectedProvider = adapter?.provider ?? null;

  console.log('[parseUnified] Detected provider:', detectedProvider, 'for file:', filename);

  // --- 2. Route to correct parser ---
  if (detectedProvider === 'wiline') {
    const wilineRows = parseWiLineCsvFile(filename, content);
    // --- 3. Fix machine field: description only, selection → metadata_raw ---
    return wilineRows.map(row => fixWiLineMachineField(row));
  }

  // LM Control and all other formats: delegate to existing parseMultiCsvFile
  // (which already handles lm_control routing internally)
  return parseMultiCsvFile(filename, content);
}

/**
 * Fix WiLine machine field to contain ONLY the description.
 * 
 * parseWiLine.ts currently produces:
 *   machine = "22 - Séchoirs 13kg"   (selection + " - " + description)
 * 
 * This function corrects it to:
 *   machine = "Séchoirs 13kg"         (description only)
 *   metadata_raw.selection = "22"     (already set by parseWiLine)
 * 
 * This is non-breaking: we only post-process the output, never touch parseWiLine.ts.
 */
function fixWiLineMachineField(row: WiLineParsedRow): WiLineParsedRow {
  const selection = row.metadata_raw?.selection as string | undefined;

  if (!row.machine || !selection) {
    return row;
  }

  // Remove the "selection - " prefix if present
  const prefix = `${selection} - `;
  let cleanMachine = row.machine;

  if (cleanMachine.startsWith(prefix)) {
    cleanMachine = cleanMachine.slice(prefix.length).trim();
  } else if (cleanMachine === selection) {
    // machine was just the selection number (no description)
    // Keep as-is — better than empty
    return row;
  }

  return {
    ...row,
    machine: cleanMachine || null,
    machine_name: cleanMachine || null,
  };
}
