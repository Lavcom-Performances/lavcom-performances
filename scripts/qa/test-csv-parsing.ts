/**
 * Test script for multi-CSV parsing
 * Run: npx ts-node scripts/qa/test-csv-parsing.ts
 */

import { parseMultiCsvFile } from '../../src/lib/csv/parseMultiCsv';
import { calculateMultiCsvSummary } from '../../src/lib/csv/multiCsvTypes';
import * as fs from 'fs';
import * as path from 'path';

const FIXTURES_DIR = path.join(__dirname, 'fixtures');

const testFiles = [
  'events_4.csv',
  'test-cb-esp.csv',
  'test-fi-gratuit.csv',
  'test-edge-cases.csv',
];

console.log('=== TEST PARSING MULTI-CSV ===\n');

const allRows: any[] = [];
const files: { filename: string; rowCount: number }[] = [];

for (const filename of testFiles) {
  const filepath = path.join(FIXTURES_DIR, filename);
  
  if (!fs.existsSync(filepath)) {
    console.log(`❌ Fichier non trouvé: ${filename}`);
    continue;
  }
  
  const content = fs.readFileSync(filepath, 'utf-8');
  const rows = parseMultiCsvFile(filename, content);
  
  console.log(`📁 ${filename}`);
  console.log(`   Total lignes parsées: ${rows.length}`);
  
  const importable = rows.filter(r => r.status === 'importable');
  const toReview = rows.filter(r => r.status === 'to_review');
  const invalid = rows.filter(r => r.status === 'invalid');
  
  console.log(`   ✅ Importable: ${importable.length}`);
  console.log(`   ⚠️  À vérifier: ${toReview.length}`);
  console.log(`   ❌ Invalide: ${invalid.length}`);
  
  // Payment modes breakdown
  const byMode: Record<string, number> = {};
  rows.forEach(r => {
    const mode = r.normalized_mode || 'UNKNOWN';
    byMode[mode] = (byMode[mode] || 0) + 1;
  });
  console.log(`   Modes: ${JSON.stringify(byMode)}`);
  
  // Show first 3 rows
  console.log(`   Aperçu (3 premières lignes):`);
  rows.slice(0, 3).forEach((r, i) => {
    console.log(`     ${i + 1}. Date: ${r.date_iso}, Mode: ${r.normalized_mode}, Montant: ${r.amount_cents ? (r.amount_cents / 100).toFixed(2) + '€' : 'N/A'}, Status: ${r.status}`);
  });
  
  // Show errors if any
  if (toReview.length > 0 || invalid.length > 0) {
    console.log(`   Erreurs:`);
    [...toReview, ...invalid].slice(0, 5).forEach(r => {
      console.log(`     - Ligne ${r.row_index_in_file}: ${r.errors.join(', ')}`);
    });
  }
  
  allRows.push(...rows);
  files.push({ filename, rowCount: rows.length });
  
  console.log('');
}

// Calculate summary
console.log('=== RÉCAPITULATIF GLOBAL ===\n');

const summary = calculateMultiCsvSummary(
  files.map(f => ({ filename: f.filename, content: '', rows: [], errors: [] })),
  allRows
);

console.log(`📊 Total fichiers: ${files.length}`);
console.log(`📊 Total lignes: ${summary.total_rows}`);
console.log(`📊 Sélectionnées: ${summary.selected_count}`);
console.log(`📊 À vérifier: ${summary.to_review_count}`);
console.log('');
console.log(`💳 Total CB: ${(summary.total_cb_cents / 100).toFixed(2)} €`);
console.log(`💵 Total ESP: ${(summary.total_esp_cents / 100).toFixed(2)} €`);
console.log(`🎁 Total FI: ${(summary.total_fi_cents / 100).toFixed(2)} €`);
console.log('');
console.log(`💰 Total CB + ESP: ${summary.total_cb_esp_display.toFixed(2)} €`);
console.log(`💰 Total FI: ${summary.total_fi_display.toFixed(2)} €`);
console.log('');
console.log(`📅 Période: ${summary.min_date || 'N/A'} → ${summary.max_date || 'N/A'}`);

console.log('\n=== FIN DES TESTS ===');
