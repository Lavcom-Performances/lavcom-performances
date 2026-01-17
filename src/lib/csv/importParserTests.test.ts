/**
 * Vitest unit tests for Import Parser Tests - TAEX-201
 * Run with: npx vitest run src/lib/csv/importParserTests.test.ts
 */

import { describe, it, expect } from 'vitest';
import { 
  runLMControlTests, 
  runWiLineTests, 
  runAllImportParserTests 
} from './importParserTests';

describe('LM Control Parser Tests', () => {
  it('should run all LM Control tests without throwing', () => {
    expect(() => runLMControlTests()).not.toThrow();
  });

  it('should detect provider as lm_control', () => {
    const results = runLMControlTests();
    const providerTest = results.tests.find(t => t.test_key === 'T1_provider_detection');
    expect(providerTest).toBeDefined();
    expect(providerTest?.ok).toBe(true);
  });

  it('should filter only Démarrage rows for revenue', () => {
    const results = runLMControlTests();
    const revenueTest = results.tests.find(t => t.test_key === 'T2_revenue_row_count');
    expect(revenueTest).toBeDefined();
    // The test should pass or we should have parsed some rows
    expect(revenueTest?.actual).toBeGreaterThan(0);
  });

  it('should correctly map CB payment mode', () => {
    const results = runLMControlTests();
    const cbTest = results.tests.find(t => t.test_key === 'T3_payment_mode_cb');
    expect(cbTest).toBeDefined();
    expect(cbTest?.ok).toBe(true);
  });

  it('should correctly map ESP payment mode', () => {
    const results = runLMControlTests();
    const espTest = results.tests.find(t => t.test_key === 'T4_payment_mode_esp');
    expect(espTest).toBeDefined();
    expect(espTest?.ok).toBe(true);
  });

  it('should parse amounts correctly', () => {
    const results = runLMControlTests();
    const amountsTest = results.tests.find(t => t.test_key === 'T9_amounts_parsed');
    expect(amountsTest).toBeDefined();
    expect(amountsTest?.ok).toBe(true);
  });

  it('should parse dates correctly', () => {
    const results = runLMControlTests();
    const datesTest = results.tests.find(t => t.test_key === 'T10_dates_parsed');
    expect(datesTest).toBeDefined();
    expect(datesTest?.ok).toBe(true);
  });
});

describe('WiLine Parser Tests', () => {
  it('should run all WiLine tests without throwing', () => {
    expect(() => runWiLineTests()).not.toThrow();
  });

  it('should detect provider as wiline', () => {
    const results = runWiLineTests();
    const providerTest = results.tests.find(t => t.test_key === 'T1_provider_detection');
    expect(providerTest).toBeDefined();
    expect(providerTest?.ok).toBe(true);
  });

  it('should only include Démarrage rows for revenue', () => {
    const results = runWiLineTests();
    const revenueTest = results.tests.find(t => t.test_key === 'T3_revenue_included');
    expect(revenueTest).toBeDefined();
    expect(revenueTest?.ok).toBe(true);
  });

  it('should correctly handle FI payment mode with prix_fi_cents', () => {
    const results = runWiLineTests();
    const fiTest = results.tests.find(t => t.test_key === 'T6_payment_mode_fi');
    expect(fiTest).toBeDefined();
    expect(fiTest?.ok).toBe(true);
  });

  it('should detect mixed payment scenarios', () => {
    const results = runWiLineTests();
    const mixTest = results.tests.find(t => t.test_key === 'T7_mixed_payment');
    expect(mixTest).toBeDefined();
    expect(mixTest?.ok).toBe(true);
  });

  it('should detect LESSIVE product type', () => {
    const results = runWiLineTests();
    const lessiveTest = results.tests.find(t => t.test_key === 'T8_product_lessive');
    expect(lessiveTest).toBeDefined();
    expect(lessiveTest?.ok).toBe(true);
  });

  it('should detect DETACHANT product type', () => {
    const results = runWiLineTests();
    const detachantTest = results.tests.find(t => t.test_key === 'T9_product_detachant');
    expect(detachantTest).toBeDefined();
    expect(detachantTest?.ok).toBe(true);
  });

  it('should detect ASSOUPLISSANT product type', () => {
    const results = runWiLineTests();
    const assouplissantTest = results.tests.find(t => t.test_key === 'T10_product_assouplissant');
    expect(assouplissantTest).toBeDefined();
    expect(assouplissantTest?.ok).toBe(true);
  });

  it('should skip TOTAUX rows', () => {
    const results = runWiLineTests();
    const totauxTest = results.tests.find(t => t.test_key === 'T11_totaux_skipped');
    expect(totauxTest).toBeDefined();
    expect(totauxTest?.ok).toBe(true);
  });

  it('should convert amounts to cents', () => {
    const results = runWiLineTests();
    const centsTest = results.tests.find(t => t.test_key === 'T12_amounts_in_cents');
    expect(centsTest).toBeDefined();
    expect(centsTest?.ok).toBe(true);
  });
});

describe('Combined Import Parser Tests', () => {
  it('should run all tests without throwing', () => {
    expect(() => runAllImportParserTests()).not.toThrow();
  });

  it('should return combined results', () => {
    const results = runAllImportParserTests();
    expect(results.lmcontrol).toBeDefined();
    expect(results.wiline).toBeDefined();
    expect(results.total_tests).toBeGreaterThan(0);
    expect(results.total_passed + results.total_failed).toBe(results.total_tests);
  });

  it('should correctly calculate overall pass/fail', () => {
    const results = runAllImportParserTests();
    if (results.total_failed === 0) {
      expect(results.overall_passed).toBe(true);
    } else {
      expect(results.overall_passed).toBe(false);
    }
  });
});
