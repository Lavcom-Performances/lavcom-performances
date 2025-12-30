/**
 * Unit tests for CSV import business rules
 * 
 * Run with: npx vitest run src/lib/csv/businessRules.test.ts
 */

import { describe, it, expect } from 'vitest';
import { applyBusinessRules, OperationForBusinessRules } from './businessRules';

describe('applyBusinessRules', () => {
  describe('Rech ESP rule (TAEX-145)', () => {
    it('should transform ESP top-up line without sale (TYPE empty, PRIX=0, INSERE>0)', () => {
      const op: OperationForBusinessRules = {
        payment_mode: 'ESP',
        type: '',
        inserted_eur: 20,
        price_eur: 0,
        price_esp: 0,
        price_cb: 0,
        amount: 0,
      };

      const result = applyBusinessRules(op);

      expect(result.rechEspFixed).toBe(true);
      expect(op.type).toBe('Rech ESP');
      expect(op.price_eur).toBe(20);
      expect(op.price_esp).toBe(20);
      expect(op.amount).toBe(20);
    });

    it('should transform ESP top-up with null TYPE', () => {
      const op: OperationForBusinessRules = {
        payment_mode: 'ESP',
        type: null,
        inserted_eur: 15.50,
        price_eur: null,
        price_esp: null,
        price_cb: null,
        amount: null,
      };

      const result = applyBusinessRules(op);

      expect(result.rechEspFixed).toBe(true);
      expect(op.type).toBe('Rech ESP');
      expect(op.price_esp).toBe(15.50);
    });

    it('should handle case-insensitive payment mode "esp"', () => {
      const op: OperationForBusinessRules = {
        payment_mode: 'esp',
        type: '',
        inserted_eur: 10,
        price_eur: 0,
        price_esp: 0,
        price_cb: 0,
        amount: 0,
      };

      const result = applyBusinessRules(op);

      expect(result.rechEspFixed).toBe(true);
      expect(op.type).toBe('Rech ESP');
    });

    it('should handle alternate payment mode "ESPECES"', () => {
      const op: OperationForBusinessRules = {
        payment_mode: 'ESPECES',
        type: '',
        inserted_eur: 5,
        price_eur: 0,
        price_esp: 0,
        price_cb: 0,
        amount: 0,
      };

      const result = applyBusinessRules(op);

      expect(result.rechEspFixed).toBe(true);
      expect(op.type).toBe('Rech ESP');
    });

    it('should handle alternate payment mode "CASH"', () => {
      const op: OperationForBusinessRules = {
        payment_mode: 'CASH',
        type: '',
        inserted_eur: 8,
        price_eur: 0,
        price_esp: 0,
        price_cb: 0,
        amount: 0,
      };

      const result = applyBusinessRules(op);

      expect(result.rechEspFixed).toBe(true);
      expect(op.type).toBe('Rech ESP');
    });

    // Cases where the rule should NOT apply

    it('should NOT transform normal ESP sale (PRIX > 0)', () => {
      const op: OperationForBusinessRules = {
        payment_mode: 'ESP',
        type: '',
        inserted_eur: 20,
        price_eur: 6.50,
        price_esp: 6.50,
        price_cb: 0,
        amount: 6.50,
      };

      const result = applyBusinessRules(op);

      expect(result.rechEspFixed).toBe(false);
      expect(op.type).toBe(''); // Unchanged
      expect(op.price_esp).toBe(6.50); // Unchanged
    });

    it('should NOT transform CB top-up (payment_mode = CB)', () => {
      const op: OperationForBusinessRules = {
        payment_mode: 'CB',
        type: '',
        inserted_eur: 20,
        price_eur: 0,
        price_esp: 0,
        price_cb: 0,
        amount: 0,
      };

      const result = applyBusinessRules(op);

      expect(result.rechEspFixed).toBe(false);
      expect(op.type).toBe(''); // Unchanged
    });

    it('should NOT transform if TYPE is already set', () => {
      const op: OperationForBusinessRules = {
        payment_mode: 'ESP',
        type: 'Lavage',
        inserted_eur: 20,
        price_eur: 0,
        price_esp: 0,
        price_cb: 0,
        amount: 0,
      };

      const result = applyBusinessRules(op);

      expect(result.rechEspFixed).toBe(false);
      expect(op.type).toBe('Lavage'); // Unchanged
    });

    it('should NOT transform if INSERE is 0', () => {
      const op: OperationForBusinessRules = {
        payment_mode: 'ESP',
        type: '',
        inserted_eur: 0,
        price_eur: 0,
        price_esp: 0,
        price_cb: 0,
        amount: 0,
      };

      const result = applyBusinessRules(op);

      expect(result.rechEspFixed).toBe(false);
      expect(op.type).toBe(''); // Unchanged
    });

    it('should NOT transform if INSERE is negative', () => {
      const op: OperationForBusinessRules = {
        payment_mode: 'ESP',
        type: '',
        inserted_eur: -5,
        price_eur: 0,
        price_esp: 0,
        price_cb: 0,
        amount: 0,
      };

      const result = applyBusinessRules(op);

      expect(result.rechEspFixed).toBe(false);
    });

    it('should NOT transform if PRIX_ESP already > 0', () => {
      const op: OperationForBusinessRules = {
        payment_mode: 'ESP',
        type: '',
        inserted_eur: 20,
        price_eur: 0,
        price_esp: 5,
        price_cb: 0,
        amount: 0,
      };

      const result = applyBusinessRules(op);

      expect(result.rechEspFixed).toBe(false);
      expect(op.price_esp).toBe(5); // Unchanged
    });

    it('should NOT transform if PRIX_CB > 0 (guard against mixed payments)', () => {
      const op: OperationForBusinessRules = {
        payment_mode: 'ESP',
        type: '',
        inserted_eur: 20,
        price_eur: 0,
        price_esp: 0,
        price_cb: 5,
        amount: 0,
      };

      const result = applyBusinessRules(op);

      expect(result.rechEspFixed).toBe(false);
    });

    it('should NOT transform FI payment mode', () => {
      const op: OperationForBusinessRules = {
        payment_mode: 'FI',
        type: '',
        inserted_eur: 20,
        price_eur: 0,
        price_esp: 0,
        price_cb: 0,
        amount: 0,
      };

      const result = applyBusinessRules(op);

      expect(result.rechEspFixed).toBe(false);
    });

    // Edge cases

    it('should handle whitespace-only TYPE as empty', () => {
      const op: OperationForBusinessRules = {
        payment_mode: 'ESP',
        type: '   ',
        inserted_eur: 10,
        price_eur: 0,
        price_esp: 0,
        price_cb: 0,
        amount: 0,
      };

      const result = applyBusinessRules(op);

      expect(result.rechEspFixed).toBe(true);
      expect(op.type).toBe('Rech ESP');
    });

    it('should handle undefined values gracefully', () => {
      const op: OperationForBusinessRules = {
        payment_mode: 'ESP',
        type: undefined as any,
        inserted_eur: 10,
        price_eur: undefined,
        price_esp: undefined,
        price_cb: undefined,
        amount: undefined,
      };

      const result = applyBusinessRules(op);

      expect(result.rechEspFixed).toBe(true);
      expect(op.type).toBe('Rech ESP');
    });

    it('should preserve decimal precision in amounts', () => {
      const op: OperationForBusinessRules = {
        payment_mode: 'ESP',
        type: '',
        inserted_eur: 12.75,
        price_eur: 0,
        price_esp: 0,
        price_cb: 0,
        amount: 0,
      };

      const result = applyBusinessRules(op);

      expect(result.rechEspFixed).toBe(true);
      expect(op.price_esp).toBe(12.75);
      expect(op.amount).toBe(12.75);
    });
  });
});
