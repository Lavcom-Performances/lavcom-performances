/**
 * Unit tests for CSV import business rules
 * 
 * Run with: npx vitest run src/lib/csv/businessRules.test.ts
 */

import { describe, it, expect } from 'vitest';
import { 
  processOperationForImport, 
  normalizeMoneyToEuros, 
  applyRechEspRule,
  centsToEurosValue,
  round2,
  normStr,
  normMode,
  OperationRowRaw,
  OperationRowNormalized 
} from './businessRules';

describe('centsToEurosValue', () => {
  it('should convert number centimes to euros', () => {
    expect(centsToEurosValue(2000)).toBe(20);
    expect(centsToEurosValue(150)).toBe(1.5);
    expect(centsToEurosValue(99)).toBe(0.99);
  });

  it('should handle string centimes', () => {
    expect(centsToEurosValue('2000')).toBe(20);
    expect(centsToEurosValue('650')).toBe(6.5);
  });

  it('should handle string with spaces', () => {
    expect(centsToEurosValue('2 000')).toBe(20);
    expect(centsToEurosValue(' 1500 ')).toBe(15);
  });

  it('should handle French decimal comma', () => {
    expect(centsToEurosValue('2000,00')).toBe(20);
  });

  it('should return 0 for null/undefined/empty', () => {
    expect(centsToEurosValue(null)).toBe(0);
    expect(centsToEurosValue(undefined)).toBe(0);
    expect(centsToEurosValue('')).toBe(0);
  });

  it('should return 0 for invalid values', () => {
    expect(centsToEurosValue('abc')).toBe(0);
    expect(centsToEurosValue(NaN)).toBe(0);
  });
});

describe('round2', () => {
  it('should round to 2 decimal places', () => {
    expect(round2(1.234)).toBe(1.23);
    expect(round2(1.235)).toBe(1.24);
    expect(round2(1.2)).toBe(1.2);
  });
});

describe('normMode', () => {
  it('should normalize payment modes', () => {
    expect(normMode('ESP')).toBe('ESP');
    expect(normMode('esp')).toBe('ESP');
    expect(normMode('ESPECES')).toBe('ESP');
    expect(normMode('CASH')).toBe('ESP');
    expect(normMode('CB')).toBe('CB');
    expect(normMode('CARTE')).toBe('CB');
    expect(normMode('FI')).toBe('FI');
  });
});

describe('normalizeMoneyToEuros', () => {
  it('should convert all money fields from centimes to euros', () => {
    const raw: OperationRowRaw = {
      mode: 'ESP',
      type: null,
      insere: 2000,
      prix: 650,
      rendu: 50,
      prix_cb: 0,
      prix_esp: 650,
    };

    const result = normalizeMoneyToEuros(raw);

    expect(result.insere_eur).toBe(20);
    expect(result.prix_eur).toBe(6.5);
    expect(result.rendu_eur).toBe(0.5);
    expect(result.prix_cb_eur).toBe(0);
    expect(result.prix_esp_eur).toBe(6.5);
  });
});

describe('applyRechEspRule', () => {
  it('should transform ESP top-up without sale (INSERE>0, PRIX=0)', () => {
    const op: OperationRowNormalized = {
      mode: 'ESP',
      type: '',
      insere_eur: 20,
      prix_eur: 0,
      rendu_eur: 0,
      prix_cb_eur: 0,
      prix_esp_eur: 0,
    };

    const result = applyRechEspRule(op);

    expect(result).toBe(true);
    expect(op.type).toBe('Rech ESP');
    expect(op.prix_eur).toBe(20);
    expect(op.prix_esp_eur).toBe(20);
  });

  it('should NOT transform normal sale (PRIX > 0)', () => {
    const op: OperationRowNormalized = {
      mode: 'ESP',
      type: '',
      insere_eur: 20,
      prix_eur: 6.5,
      rendu_eur: 0,
      prix_cb_eur: 0,
      prix_esp_eur: 6.5,
    };

    const result = applyRechEspRule(op);

    expect(result).toBe(false);
    expect(op.type).toBe('');
  });

  it('should NOT transform CB payment', () => {
    const op: OperationRowNormalized = {
      mode: 'CB',
      type: '',
      insere_eur: 20,
      prix_eur: 0,
      rendu_eur: 0,
      prix_cb_eur: 0,
      prix_esp_eur: 0,
    };

    const result = applyRechEspRule(op);

    expect(result).toBe(false);
  });

  it('should NOT transform if TYPE is set', () => {
    const op: OperationRowNormalized = {
      mode: 'ESP',
      type: 'Lavage',
      insere_eur: 20,
      prix_eur: 0,
      rendu_eur: 0,
      prix_cb_eur: 0,
      prix_esp_eur: 0,
    };

    const result = applyRechEspRule(op);

    expect(result).toBe(false);
    expect(op.type).toBe('Lavage');
  });
});

describe('processOperationForImport (full pipeline)', () => {
  it('should convert centimes to euros AND apply Rech ESP rule', () => {
    const raw: OperationRowRaw = {
      mode: 'ESP',
      type: '',
      insere: 2000,  // 20€ in centimes
      prix: 0,
      rendu: 0,
      prix_cb: 0,
      prix_esp: 0,
    };

    const result = processOperationForImport(raw);

    expect(result.rechEspFixed).toBe(true);
    expect(result.operation.type).toBe('Rech ESP');
    expect(result.operation.insere_eur).toBe(20);
    expect(result.operation.prix_eur).toBe(20);
    expect(result.operation.prix_esp_eur).toBe(20);
  });

  it('should convert normal sale without triggering Rech ESP', () => {
    const raw: OperationRowRaw = {
      mode: 'ESP',
      type: '',
      insere: 2000,
      prix: 650,      // 6.50€ in centimes - normal sale
      rendu: 1350,    // 13.50€ change
      prix_cb: 0,
      prix_esp: 650,
    };

    const result = processOperationForImport(raw);

    expect(result.rechEspFixed).toBe(false);
    expect(result.operation.type).toBe('');
    expect(result.operation.insere_eur).toBe(20);
    expect(result.operation.prix_eur).toBe(6.5);
    expect(result.operation.rendu_eur).toBe(13.5);
    expect(result.operation.prix_esp_eur).toBe(6.5);
  });

  it('should handle CB transaction correctly', () => {
    const raw: OperationRowRaw = {
      mode: 'CB',
      type: '',
      insere: 0,
      prix: 750,
      rendu: 0,
      prix_cb: 750,
      prix_esp: 0,
    };

    const result = processOperationForImport(raw);

    expect(result.rechEspFixed).toBe(false);
    expect(result.operation.prix_eur).toBe(7.5);
    expect(result.operation.prix_cb_eur).toBe(7.5);
    expect(result.operation.prix_esp_eur).toBe(0);
  });

  it('should handle whitespace-only TYPE as empty', () => {
    const raw: OperationRowRaw = {
      mode: 'ESP',
      type: '   ',
      insere: 1000,
      prix: 0,
      rendu: 0,
      prix_cb: 0,
      prix_esp: 0,
    };

    const result = processOperationForImport(raw);

    expect(result.rechEspFixed).toBe(true);
    expect(result.operation.type).toBe('Rech ESP');
  });

  it('should handle case-insensitive ESPECES mode', () => {
    const raw: OperationRowRaw = {
      mode: 'especes',
      type: null,
      insere: 500,
      prix: 0,
      rendu: 0,
      prix_cb: 0,
      prix_esp: 0,
    };

    const result = processOperationForImport(raw);

    expect(result.rechEspFixed).toBe(true);
    expect(result.operation.type).toBe('Rech ESP');
    expect(result.operation.prix_eur).toBe(5);
  });

  it('should NOT apply rule if INSERE is 0', () => {
    const raw: OperationRowRaw = {
      mode: 'ESP',
      type: '',
      insere: 0,
      prix: 0,
      rendu: 0,
      prix_cb: 0,
      prix_esp: 0,
    };

    const result = processOperationForImport(raw);

    expect(result.rechEspFixed).toBe(false);
  });

  it('should NOT apply rule if PRIX_CB > 0 (mixed payment guard)', () => {
    const raw: OperationRowRaw = {
      mode: 'ESP',
      type: '',
      insere: 2000,
      prix: 0,
      rendu: 0,
      prix_cb: 500,  // Some CB payment
      prix_esp: 0,
    };

    const result = processOperationForImport(raw);

    expect(result.rechEspFixed).toBe(false);
  });

  it('should preserve decimal precision', () => {
    const raw: OperationRowRaw = {
      mode: 'ESP',
      type: '',
      insere: 1275,  // 12.75€
      prix: 0,
      rendu: 0,
      prix_cb: 0,
      prix_esp: 0,
    };

    const result = processOperationForImport(raw);

    expect(result.rechEspFixed).toBe(true);
    expect(result.operation.insere_eur).toBe(12.75);
    expect(result.operation.prix_eur).toBe(12.75);
    expect(result.operation.prix_esp_eur).toBe(12.75);
  });
});
