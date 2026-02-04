/**
 * TAEX-245: Adapter Tests
 * 
 * Tests for Wi-Line and LM Control CSV adapters
 */

import { describe, it, expect } from 'vitest';
import { wilineAdapter } from './wilineAdapter';
import { lmControlAdapter } from './lmControlAdapter';
import { adapterRegistry, parseHeadersFromContent, detectProviderFromContent } from './index';

describe('Wi-Line Adapter', () => {
  const sampleWiLineCSV = `Date/Heure(Europe/Paris);;Type;Selection;Description;Pièce;Billet;Carte bancaire;Fidélitée;Prix;Insérée;Rendue
20/12/2025;08:00:00;Démarrage;22;Séchoirs 13kg;0,00;0,00;4,50;0,00;4,50;0,00;0,00
20/12/2025;09:15:00;Démarrage;17;Machines 12kg;0,00;0,00;0,00;8,50;8,50;0,00;0,00
20/12/2025;10:30:00;Démarrage;05;Lessive;2,00;0,00;0,00;0,00;1,00;2,00;1,00`;

  it('should detect Wi-Line format', () => {
    const headers = parseHeadersFromContent(sampleWiLineCSV);
    const confidence = wilineAdapter.detectFormat(headers);
    expect(confidence).toBeGreaterThanOrEqual(0.7);
  });

  it('should parse Wi-Line CSV correctly', () => {
    const transactions = wilineAdapter.parse('test.csv', sampleWiLineCSV, {
      site_id: 'test-site',
      provider: 'wiline',
    });
    
    expect(transactions).toHaveLength(3);
    
    // First row: CB payment
    expect(transactions[0].payment_mode).toBe('CB');
    expect(transactions[0].price_cents).toBe(450);
    expect(transactions[0].price_cb_cents).toBe(450);
    expect(transactions[0].price_esp_cents).toBe(0);
    expect(transactions[0].price_fi_cents).toBe(0);
    
    // Second row: FI (loyalty) payment
    expect(transactions[1].payment_mode).toBe('FI');
    expect(transactions[1].price_cents).toBe(850);
    expect(transactions[1].price_fi_cents).toBe(850);
    expect(transactions[1].price_cb_cents).toBe(0);
    
    // Third row: ESP (cash) payment
    expect(transactions[2].payment_mode).toBe('ESP');
    expect(transactions[2].price_cents).toBe(100);
    expect(transactions[2].price_esp_cents).toBe(100);
    expect(transactions[2].inserted_cents).toBe(200);
    expect(transactions[2].change_cents).toBe(100);
  });

  it('should enforce business invariants', () => {
    const transactions = wilineAdapter.parse('test.csv', sampleWiLineCSV, {
      site_id: 'test-site',
      provider: 'wiline',
    });
    
    // Check that payment breakdown matches payment mode
    transactions.forEach(tx => {
      if (tx.payment_mode === 'CB') {
        expect(tx.price_cb_cents).toBe(tx.price_cents);
        expect(tx.price_esp_cents).toBe(0);
        expect(tx.price_fi_cents).toBe(0);
      } else if (tx.payment_mode === 'ESP') {
        expect(tx.price_esp_cents).toBe(tx.price_cents);
        expect(tx.price_cb_cents).toBe(0);
        expect(tx.price_fi_cents).toBe(0);
      } else if (tx.payment_mode === 'FI') {
        expect(tx.price_fi_cents).toBe(tx.price_cents);
        expect(tx.price_cb_cents).toBe(0);
        expect(tx.price_esp_cents).toBe(0);
      }
    });
  });
});

describe('LM Control Adapter', () => {
  const sampleLMControlCSV = `Events

id,type,name,payment_mode,amount,price,change,detail,date
"test001","vend","Lave linge 1","cb",450,450,0,"","2025-12-20 08:00:00"
"test002","vend","Seche linge 1","esp",600,450,150,"","2025-12-20 09:15:00"
"test003","vend","Lessive","fi",100,60,0,"","2025-12-20 10:30:00"`;

  it('should detect LM Control format', () => {
    const headers = parseHeadersFromContent(sampleLMControlCSV);
    const confidence = lmControlAdapter.detectFormat(headers);
    expect(confidence).toBeGreaterThanOrEqual(0.6);
  });

  it('should parse LM Control CSV correctly', () => {
    const transactions = lmControlAdapter.parse('test.csv', sampleLMControlCSV, {
      site_id: 'test-site',
      provider: 'lmcontrol',
    });
    
    expect(transactions).toHaveLength(3);
    
    // Check payment modes
    expect(transactions[0].payment_mode).toBe('CB');
    expect(transactions[1].payment_mode).toBe('ESP');
    expect(transactions[2].payment_mode).toBe('FI');
    
    // Check display labels are stable
    expect(transactions[0].display_label).toBe('Lave linge 1');
    expect(transactions[1].display_label).toBe('Seche linge 1');
    expect(transactions[2].display_label).toBe('Lessive');
  });
});

describe('Adapter Registry', () => {
  it('should detect correct adapter from content', () => {
    const wilineCSV = `Date/Heure(Europe/Paris);;Type;Selection;Description;Pièce;Billet;Carte bancaire;Fidélitée;Prix;Insérée;Rendue`;
    const detected = detectProviderFromContent(wilineCSV);
    expect(detected).toBe('wiline');
  });

  it('should return all adapters', () => {
    const adapters = adapterRegistry.getAdapters();
    expect(adapters.length).toBeGreaterThanOrEqual(2);
    expect(adapters.some(a => a.provider === 'wiline')).toBe(true);
    expect(adapters.some(a => a.provider === 'lmcontrol')).toBe(true);
  });
});
