/**
 * Import Parser Regression Tests - TAEX-201
 * 
 * Tests for CSV parser to prevent regressions in:
 * - Provider detection (LM Control vs WiLine)
 * - Revenue rules (WiLine: only Type="Démarrage")
 * - Payment mode mapping (CB/ESP/FI/MIX)
 * - Product type detection (Lessive/Détachant/Assouplissant)
 * - Dedupe logic
 */

import { parseMultiCsvFile } from './parseMultiCsv';
import { parseUnifiedCsvFile } from './parseUnified';
import { MultiCsvParsedRow } from './multiCsvTypes';
import { WiLineParsedRow } from './parseWiLine';

// Import test fixtures as raw strings
import lmcontrolSampleCsv from './__fixtures__/lmcontrol_sample.csv?raw';
import wilineSampleCsv from './__fixtures__/wiline_sample.csv?raw';

export interface ImportTestResult {
  test_key: string;
  ok: boolean;
  details: string;
  expected?: unknown;
  actual?: unknown;
}

export interface ImportTestSuite {
  provider: 'lmcontrol' | 'wiline';
  tests: ImportTestResult[];
  passed: number;
  failed: number;
  duration_ms: number;
}

/**
 * Run LM Control parser tests
 */
export function runLMControlTests(): ImportTestSuite {
  const startTime = performance.now();
  const tests: ImportTestResult[] = [];
  
  // Parse fixture
  const rows = parseMultiCsvFile('lmcontrol_sample.csv', lmcontrolSampleCsv);
  
  // T1: Provider detection - LM Control uses same format as WiLine
  // Both are from LaundryLine terminals, so detecting as 'wiline' is correct
  tests.push({
    test_key: 'T1_provider_detection',
    ok: rows.length > 0 && (rows[0].detected_type === 'wiline' || rows[0].detected_type === 'lm_control'),
    details: rows.length > 0 
      ? `Detected: ${rows[0].detected_type}` 
      : 'No rows parsed',
    expected: 'wiline or lm_control',
    actual: rows[0]?.detected_type,
  });
  
  // T2: Revenue row filtering (only Démarrage rows)
  // Fixture has 10 rows: 7 Démarrage, 1 Rechargement, 1 Annulé, 1 duplicate
  // After filtering: should have 7 Démarrage rows (including 1 duplicate)
  const expectedDemarrageCount = 7; // 6 unique + 1 duplicate
  tests.push({
    test_key: 'T2_revenue_row_count',
    ok: rows.length === expectedDemarrageCount,
    details: `Expected ${expectedDemarrageCount} Démarrage rows, got ${rows.length}`,
    expected: expectedDemarrageCount,
    actual: rows.length,
  });
  
  // T3: Payment mode mapping - CB
  const cbRows = rows.filter(r => r.normalized_mode === 'CB');
  tests.push({
    test_key: 'T3_payment_mode_cb',
    ok: cbRows.length >= 2, // Machine 8kg CB and Lessive CB
    details: `Found ${cbRows.length} CB rows`,
    expected: '>=2',
    actual: cbRows.length,
  });
  
  // T4: Payment mode mapping - ESP
  const espRows = rows.filter(r => r.normalized_mode === 'ESP');
  tests.push({
    test_key: 'T4_payment_mode_esp',
    ok: espRows.length >= 2, // Séchoir ESP and Machine with Pièce+Billet
    details: `Found ${espRows.length} ESP rows`,
    expected: '>=2',
    actual: espRows.length,
  });
  
  // T5: Payment mode mapping - FI (Fidélité)
  const fiRows = rows.filter(r => r.normalized_mode === 'FI');
  tests.push({
    test_key: 'T5_payment_mode_fi',
    ok: fiRows.length >= 1, // Machine with Fidélitée
    details: `Found ${fiRows.length} FI rows`,
    expected: '>=1',
    actual: fiRows.length,
  });
  
  // T6: Product type detection - Lessive
  const lessiveRows = rows.filter(r => 
    r.program?.toUpperCase() === 'LESSIVE' || 
    r.machine?.toLowerCase().includes('lessive')
  );
  tests.push({
    test_key: 'T6_product_lessive',
    ok: lessiveRows.length >= 1,
    details: `Found ${lessiveRows.length} Lessive rows`,
    expected: '>=1',
    actual: lessiveRows.length,
  });
  
  // T7: Product type detection - Détachant
  const detachantRows = rows.filter(r => 
    r.program?.toUpperCase() === 'DETACHANT' || 
    r.machine?.toLowerCase().includes('détachant') ||
    r.machine?.toLowerCase().includes('detachant')
  );
  tests.push({
    test_key: 'T7_product_detachant',
    ok: detachantRows.length >= 1,
    details: `Found ${detachantRows.length} Détachant rows`,
    expected: '>=1',
    actual: detachantRows.length,
  });
  
  // T8: Product type detection - Assouplissant
  const assouplissantRows = rows.filter(r => 
    r.program?.toUpperCase() === 'ASSOUPLISSANT' || 
    r.machine?.toLowerCase().includes('assouplissant')
  );
  tests.push({
    test_key: 'T8_product_assouplissant',
    ok: assouplissantRows.length >= 1,
    details: `Found ${assouplissantRows.length} Assouplissant rows`,
    expected: '>=1',
    actual: assouplissantRows.length,
  });
  
  // T9: Amounts are properly parsed (in cents)
  const rowsWithValidAmounts = rows.filter(r => r.amount_cents !== null && r.amount_cents > 0);
  tests.push({
    test_key: 'T9_amounts_parsed',
    ok: rowsWithValidAmounts.length === rows.length,
    details: `${rowsWithValidAmounts.length}/${rows.length} rows have valid amounts`,
    expected: rows.length,
    actual: rowsWithValidAmounts.length,
  });
  
  // T10: Dates are properly parsed
  const rowsWithValidDates = rows.filter(r => r.date_iso !== null);
  tests.push({
    test_key: 'T10_dates_parsed',
    ok: rowsWithValidDates.length === rows.length,
    details: `${rowsWithValidDates.length}/${rows.length} rows have valid dates`,
    expected: rows.length,
    actual: rowsWithValidDates.length,
  });
  
  const endTime = performance.now();
  const passed = tests.filter(t => t.ok).length;
  
  return {
    provider: 'lmcontrol',
    tests,
    passed,
    failed: tests.length - passed,
    duration_ms: Math.round(endTime - startTime),
  };
}

/**
 * Run WiLine parser tests
 */
export function runWiLineTests(): ImportTestSuite {
  const startTime = performance.now();
  const tests: ImportTestResult[] = [];
  
  // Parse fixture
  const rows = parseMultiCsvFile('wiline_sample.csv', wilineSampleCsv) as WiLineParsedRow[];
  
  // T1: Provider detection
  tests.push({
    test_key: 'T1_provider_detection',
    ok: rows.length > 0 && rows[0].detected_type === 'wiline',
    details: rows.length > 0 
      ? `Detected: ${rows[0].detected_type}` 
      : 'No rows parsed',
    expected: 'wiline',
    actual: rows[0]?.detected_type,
  });
  
  // T2: Revenue row filtering (only Démarrage rows)
  // Fixture has 11 rows + TOTAUX: 8 Démarrage (1 duplicate), 1 Rechargement, 1 Annulé, 1 TOTAUX
  // After filtering: should have 8 Démarrage rows (including 1 duplicate)
  const expectedDemarrageCount = 8;
  tests.push({
    test_key: 'T2_revenue_row_count',
    ok: rows.length === expectedDemarrageCount,
    details: `Expected ${expectedDemarrageCount} Démarrage rows, got ${rows.length}`,
    expected: expectedDemarrageCount,
    actual: rows.length,
  });
  
  // T3: Revenue included flag
  const revenueRows = rows.filter(r => r.revenue_included === true);
  tests.push({
    test_key: 'T3_revenue_included',
    ok: revenueRows.length === rows.length,
    details: `${revenueRows.length}/${rows.length} rows have revenue_included=true`,
    expected: rows.length,
    actual: revenueRows.length,
  });
  
  // T4: Payment mode mapping - CB
  const cbRows = rows.filter(r => r.normalized_mode === 'CB');
  tests.push({
    test_key: 'T4_payment_mode_cb',
    ok: cbRows.length >= 2,
    details: `Found ${cbRows.length} CB rows`,
    expected: '>=2',
    actual: cbRows.length,
  });
  
  // T5: Payment mode mapping - ESP
  const espRows = rows.filter(r => r.normalized_mode === 'ESP');
  tests.push({
    test_key: 'T5_payment_mode_esp',
    ok: espRows.length >= 2,
    details: `Found ${espRows.length} ESP rows`,
    expected: '>=2',
    actual: espRows.length,
  });
  
  // T6: Payment mode mapping - FI stays in prix_fi_cents
  const fiRows = rows.filter(r => r.normalized_mode === 'FI');
  const fiWithPrixFi = fiRows.filter(r => (r.prix_fi_cents ?? 0) > 0);
  tests.push({
    test_key: 'T6_payment_mode_fi',
    ok: fiRows.length >= 2 && fiWithPrixFi.length === fiRows.length,
    details: `Found ${fiRows.length} FI rows, ${fiWithPrixFi.length} with prix_fi_cents > 0`,
    expected: '>=2 FI rows with prix_fi_cents',
    actual: { fiRows: fiRows.length, withPrixFi: fiWithPrixFi.length },
  });
  
  // T7: MIX payment handling
  const mixRows = rows.filter(r => r.is_mixed_payment === true);
  tests.push({
    test_key: 'T7_mixed_payment',
    ok: mixRows.length >= 1,
    details: `Found ${mixRows.length} MIX payment rows`,
    expected: '>=1',
    actual: mixRows.length,
  });
  
  // T8: Product type detection - Lessive
  const lessiveRows = rows.filter(r => r.operation_type === 'LESSIVE');
  tests.push({
    test_key: 'T8_product_lessive',
    ok: lessiveRows.length >= 1,
    details: `Found ${lessiveRows.length} LESSIVE operations`,
    expected: '>=1',
    actual: lessiveRows.length,
  });
  
  // T9: Product type detection - Détachant
  const detachantRows = rows.filter(r => r.operation_type === 'DETACHANT');
  tests.push({
    test_key: 'T9_product_detachant',
    ok: detachantRows.length >= 1,
    details: `Found ${detachantRows.length} DETACHANT operations`,
    expected: '>=1',
    actual: detachantRows.length,
  });
  
  // T10: Product type detection - Assouplissant
  const assouplissantRows = rows.filter(r => r.operation_type === 'ASSOUPLISSANT');
  tests.push({
    test_key: 'T10_product_assouplissant',
    ok: assouplissantRows.length >= 1,
    details: `Found ${assouplissantRows.length} ASSOUPLISSANT operations`,
    expected: '>=1',
    actual: assouplissantRows.length,
  });
  
  // T11: TOTAUX row is skipped
  const totauxRows = rows.filter(r => 
    r.label?.toUpperCase().includes('TOTAUX') || 
    r.machine?.toUpperCase().includes('TOTAUX')
  );
  tests.push({
    test_key: 'T11_totaux_skipped',
    ok: totauxRows.length === 0,
    details: totauxRows.length === 0 ? 'TOTAUX rows correctly skipped' : `Found ${totauxRows.length} TOTAUX rows`,
    expected: 0,
    actual: totauxRows.length,
  });
  
  // T12: Amounts are in cents (euros × 100)
  const sampleRow = rows.find(r => r.amount_cents !== null);
  const amountIsInCents = sampleRow && sampleRow.amount_cents! >= 100; // At least 1€
  tests.push({
    test_key: 'T12_amounts_in_cents',
    ok: amountIsInCents ?? false,
    details: sampleRow 
      ? `Sample amount: ${sampleRow.amount_cents} cents (${(sampleRow.amount_cents! / 100).toFixed(2)}€)` 
      : 'No sample row',
    expected: '>=100 (at least 1€)',
    actual: sampleRow?.amount_cents,
  });
  
  // T13: Dates are properly parsed
  const rowsWithValidDates = rows.filter(r => r.date_iso !== null);
  tests.push({
    test_key: 'T13_dates_parsed',
    ok: rowsWithValidDates.length === rows.length,
    details: `${rowsWithValidDates.length}/${rows.length} rows have valid dates`,
    expected: rows.length,
    actual: rowsWithValidDates.length,
  });
  
  // T14: Transaction numbers are captured
  const rowsWithTxNo = rows.filter(r => r.transaction_no && r.transaction_no.length > 0);
  tests.push({
    test_key: 'T14_transaction_no',
    ok: rowsWithTxNo.length === rows.length,
    details: `${rowsWithTxNo.length}/${rows.length} rows have transaction_no`,
    expected: rows.length,
    actual: rowsWithTxNo.length,
  });
  
  // T15: WiLine machine field = description only (no selection prefix)
  // Uses parseUnifiedCsvFile which applies fixWiLineMachineField
  const unifiedRows = parseUnifiedCsvFile('wiline_sample.csv', wilineSampleCsv) as WiLineParsedRow[];
  const sechoirRow = unifiedRows.find(r => r.machine?.includes('échoir'));
  tests.push({
    test_key: 'T15_machine_no_prefix',
    ok: sechoirRow !== undefined && !sechoirRow.machine?.includes(' - '),
    details: `machine = "${sechoirRow?.machine}"`,
    expected: 'no " - " prefix (description only)',
    actual: sechoirRow?.machine,
  });

  const endTime = performance.now();
  const passed = tests.filter(t => t.ok).length;
  
  return {
    provider: 'wiline',
    tests,
    passed,
    failed: tests.length - passed,
    duration_ms: Math.round(endTime - startTime),
  };
}

/**
 * Run all import parser tests
 */
export function runAllImportParserTests(): {
  lmcontrol: ImportTestSuite;
  wiline: ImportTestSuite;
  overall_passed: boolean;
  total_tests: number;
  total_passed: number;
  total_failed: number;
} {
  const lmcontrol = runLMControlTests();
  const wiline = runWiLineTests();
  
  const total_tests = lmcontrol.tests.length + wiline.tests.length;
  const total_passed = lmcontrol.passed + wiline.passed;
  const total_failed = lmcontrol.failed + wiline.failed;
  
  return {
    lmcontrol,
    wiline,
    overall_passed: total_failed === 0,
    total_tests,
    total_passed,
    total_failed,
  };
}
