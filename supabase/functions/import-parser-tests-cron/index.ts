/**
 * Import Parser Tests Cron - TAEX-201
 * 
 * Daily scheduled tests for CSV parser regression detection.
 * Alerts via email/Slack on failures using send-system-alert pipeline.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

// LM Control test fixture (inline to avoid import issues in edge function)
const lmcontrolSampleCsv = `Date;Heure;N° Machine;Libellé Machine;Prix EUR;Prix CB;Prix ESP;N° Transaction;Type
15/01/2025;08:15:00;1;Machine 8kg CB;6.00;6.00;0.00;TXN001;Démarrage
15/01/2025;09:30:00;2;Séchoir 14kg ESP;2.50;0.00;2.50;TXN002;Démarrage
15/01/2025;10:00:00;3;Machine 12kg Fidélitée;7.00;0.00;0.00;TXN003;Démarrage
15/01/2025;10:45:00;5;Machine 8kg ESP Pièce+Billet;6.00;0.00;6.00;TXN004;Démarrage
15/01/2025;11:15:00;1;Machine 8kg CB;6.00;6.00;0.00;TXN001;Démarrage
15/01/2025;12:00:00;4;Distributeur Lessive CB;1.50;1.50;0.00;TXN005;Démarrage
15/01/2025;14:00:00;6;Distributeur Détachant ESP;1.00;0.00;1.00;TXN006;Démarrage
15/01/2025;15:30:00;7;Distributeur Assouplissant CB;1.00;1.00;0.00;TXN007;Démarrage
16/01/2025;08:00:00;1;Machine 8kg CB;6.00;6.00;0.00;TXN008;Rechargement
16/01/2025;09:00:00;2;Séchoir 14kg ESP;2.50;0.00;2.50;TXN009;Annulé`;

// WiLine test fixture
const wilineSampleCsv = `Date;Heure;Machine;Label;Type;N° Transaction;Prix EUR;Prix CB;Prix ESP;Prix FI
15/01/2025;08:30:00;LV01;Lavage 8kg;Démarrage;WL001;6.00;6.00;0.00;0.00
15/01/2025;09:00:00;SE01;Séchage 14kg;Démarrage;WL002;2.50;0.00;2.50;0.00
15/01/2025;09:45:00;LV02;Lavage 12kg Fidélité;Démarrage;WL003;7.00;0.00;0.00;7.00
15/01/2025;10:30:00;LV01;Lavage 8kg;Démarrage;WL004;6.00;0.00;6.00;0.00
15/01/2025;11:00:00;DIST01;Lessive;Démarrage;WL005;1.50;1.50;0.00;0.00
15/01/2025;11:30:00;DIST02;Détachant;Démarrage;WL006;1.00;0.00;1.00;0.00
15/01/2025;12:00:00;DIST03;Assouplissant;Démarrage;WL007;1.00;0.00;0.00;1.00
15/01/2025;12:30:00;LV03;Lavage MIX;Démarrage;WL008;8.00;4.00;2.00;2.00
15/01/2025;13:00:00;LV01;Lavage 8kg;Démarrage;WL001;6.00;6.00;0.00;0.00
15/01/2025;14:00:00;RECH;Rechargement carte;Rechargement;WL009;10.00;10.00;0.00;0.00
15/01/2025;15:00:00;LV02;Lavage 12kg;Annulé;WL010;7.00;7.00;0.00;0.00
TOTAUX;;;;;;;45.50;35.50;11.50;10.00`;

interface TestResult {
  test_key: string;
  ok: boolean;
  details: string;
  expected?: unknown;
  actual?: unknown;
}

interface TestSuite {
  provider: string;
  tests: TestResult[];
  passed: number;
  failed: number;
}

// Simple CSV parser for edge function context
function parseSimpleCsv(content: string): string[][] {
  const lines = content.trim().split('\n');
  return lines.map(line => line.split(';').map(cell => cell.trim()));
}

// Detect provider from headers
function detectProvider(headers: string[]): 'lmcontrol' | 'wiline' | 'unknown' {
  const headerStr = headers.join(';').toLowerCase();
  if (headerStr.includes('libellé machine') || headerStr.includes('n° machine')) {
    return 'lmcontrol';
  }
  if (headerStr.includes('prix fi') || headerStr.includes('label')) {
    return 'wiline';
  }
  return 'unknown';
}

// Run LM Control tests
function runLMControlTests(): TestSuite {
  const tests: TestResult[] = [];
  const rows = parseSimpleCsv(lmcontrolSampleCsv);
  const headers = rows[0];
  const dataRows = rows.slice(1);
  
  // T1: Provider detection
  const provider = detectProvider(headers);
  tests.push({
    test_key: 'T1_provider_detection',
    ok: provider === 'lmcontrol',
    details: `Detected: ${provider}`,
    expected: 'lmcontrol',
    actual: provider,
  });
  
  // T2: Row count (Démarrage only)
  const typeIdx = headers.findIndex(h => h.toLowerCase() === 'type');
  const demarrageRows = dataRows.filter(r => r[typeIdx]?.toLowerCase() === 'démarrage');
  tests.push({
    test_key: 'T2_demarrage_filter',
    ok: demarrageRows.length === 8,
    details: `Expected 8 Démarrage rows, got ${demarrageRows.length}`,
    expected: 8,
    actual: demarrageRows.length,
  });
  
  // T3: CB detection
  const prixCbIdx = headers.findIndex(h => h.toLowerCase().includes('prix cb'));
  const cbRows = demarrageRows.filter(r => parseFloat(r[prixCbIdx] || '0') > 0);
  tests.push({
    test_key: 'T3_payment_cb',
    ok: cbRows.length >= 2,
    details: `Found ${cbRows.length} CB rows`,
    expected: '>=2',
    actual: cbRows.length,
  });
  
  // T4: ESP detection
  const prixEspIdx = headers.findIndex(h => h.toLowerCase().includes('prix esp'));
  const espRows = demarrageRows.filter(r => parseFloat(r[prixEspIdx] || '0') > 0);
  tests.push({
    test_key: 'T4_payment_esp',
    ok: espRows.length >= 2,
    details: `Found ${espRows.length} ESP rows`,
    expected: '>=2',
    actual: espRows.length,
  });
  
  // T5: Lessive product
  const machineIdx = headers.findIndex(h => h.toLowerCase().includes('libellé'));
  const lessiveRows = demarrageRows.filter(r => r[machineIdx]?.toLowerCase().includes('lessive'));
  tests.push({
    test_key: 'T5_product_lessive',
    ok: lessiveRows.length >= 1,
    details: `Found ${lessiveRows.length} Lessive rows`,
    expected: '>=1',
    actual: lessiveRows.length,
  });
  
  // T6: Détachant product
  const detachantRows = demarrageRows.filter(r => r[machineIdx]?.toLowerCase().includes('détachant'));
  tests.push({
    test_key: 'T6_product_detachant',
    ok: detachantRows.length >= 1,
    details: `Found ${detachantRows.length} Détachant rows`,
    expected: '>=1',
    actual: detachantRows.length,
  });
  
  // T7: Assouplissant product
  const assouplissantRows = demarrageRows.filter(r => r[machineIdx]?.toLowerCase().includes('assouplissant'));
  tests.push({
    test_key: 'T7_product_assouplissant',
    ok: assouplissantRows.length >= 1,
    details: `Found ${assouplissantRows.length} Assouplissant rows`,
    expected: '>=1',
    actual: assouplissantRows.length,
  });
  
  // T8: Amounts parsed
  const prixEurIdx = headers.findIndex(h => h.toLowerCase() === 'prix eur');
  const rowsWithAmount = demarrageRows.filter(r => parseFloat(r[prixEurIdx] || '0') > 0);
  tests.push({
    test_key: 'T8_amounts_parsed',
    ok: rowsWithAmount.length === demarrageRows.length,
    details: `${rowsWithAmount.length}/${demarrageRows.length} have valid amounts`,
    expected: demarrageRows.length,
    actual: rowsWithAmount.length,
  });
  
  const passed = tests.filter(t => t.ok).length;
  return {
    provider: 'lmcontrol',
    tests,
    passed,
    failed: tests.length - passed,
  };
}

// Run WiLine tests
function runWiLineTests(): TestSuite {
  const tests: TestResult[] = [];
  const rows = parseSimpleCsv(wilineSampleCsv);
  const headers = rows[0];
  const dataRows = rows.slice(1);
  
  // T1: Provider detection
  const provider = detectProvider(headers);
  tests.push({
    test_key: 'T1_provider_detection',
    ok: provider === 'wiline',
    details: `Detected: ${provider}`,
    expected: 'wiline',
    actual: provider,
  });
  
  // T2: Row count (Démarrage only, no TOTAUX)
  const typeIdx = headers.findIndex(h => h.toLowerCase() === 'type');
  const machineIdx = headers.findIndex(h => h.toLowerCase() === 'machine');
  const demarrageRows = dataRows.filter(r => 
    r[typeIdx]?.toLowerCase() === 'démarrage' && 
    !r[machineIdx]?.toUpperCase().includes('TOTAUX')
  );
  tests.push({
    test_key: 'T2_demarrage_filter',
    ok: demarrageRows.length === 9,
    details: `Expected 9 Démarrage rows, got ${demarrageRows.length}`,
    expected: 9,
    actual: demarrageRows.length,
  });
  
  // T3: CB detection
  const prixCbIdx = headers.findIndex(h => h.toLowerCase().includes('prix cb'));
  const cbRows = demarrageRows.filter(r => parseFloat(r[prixCbIdx] || '0') > 0);
  tests.push({
    test_key: 'T3_payment_cb',
    ok: cbRows.length >= 2,
    details: `Found ${cbRows.length} CB rows`,
    expected: '>=2',
    actual: cbRows.length,
  });
  
  // T4: ESP detection
  const prixEspIdx = headers.findIndex(h => h.toLowerCase().includes('prix esp'));
  const espRows = demarrageRows.filter(r => parseFloat(r[prixEspIdx] || '0') > 0);
  tests.push({
    test_key: 'T4_payment_esp',
    ok: espRows.length >= 2,
    details: `Found ${espRows.length} ESP rows`,
    expected: '>=2',
    actual: espRows.length,
  });
  
  // T5: FI detection (stays in Prix FI)
  const prixFiIdx = headers.findIndex(h => h.toLowerCase().includes('prix fi'));
  const fiRows = demarrageRows.filter(r => parseFloat(r[prixFiIdx] || '0') > 0);
  tests.push({
    test_key: 'T5_payment_fi',
    ok: fiRows.length >= 2,
    details: `Found ${fiRows.length} FI rows`,
    expected: '>=2',
    actual: fiRows.length,
  });
  
  // T6: MIX payment (multiple payment types in one row)
  const mixRows = demarrageRows.filter(r => {
    const cb = parseFloat(r[prixCbIdx] || '0');
    const esp = parseFloat(r[prixEspIdx] || '0');
    const fi = parseFloat(r[prixFiIdx] || '0');
    const nonZeroCount = [cb, esp, fi].filter(v => v > 0).length;
    return nonZeroCount >= 2;
  });
  tests.push({
    test_key: 'T6_mixed_payment',
    ok: mixRows.length >= 1,
    details: `Found ${mixRows.length} MIX payment rows`,
    expected: '>=1',
    actual: mixRows.length,
  });
  
  // T7: Lessive product
  const labelIdx = headers.findIndex(h => h.toLowerCase() === 'label');
  const lessiveRows = demarrageRows.filter(r => r[labelIdx]?.toLowerCase().includes('lessive'));
  tests.push({
    test_key: 'T7_product_lessive',
    ok: lessiveRows.length >= 1,
    details: `Found ${lessiveRows.length} Lessive rows`,
    expected: '>=1',
    actual: lessiveRows.length,
  });
  
  // T8: Détachant product
  const detachantRows = demarrageRows.filter(r => r[labelIdx]?.toLowerCase().includes('détachant'));
  tests.push({
    test_key: 'T8_product_detachant',
    ok: detachantRows.length >= 1,
    details: `Found ${detachantRows.length} Détachant rows`,
    expected: '>=1',
    actual: detachantRows.length,
  });
  
  // T9: Assouplissant product
  const assouplissantRows = demarrageRows.filter(r => r[labelIdx]?.toLowerCase().includes('assouplissant'));
  tests.push({
    test_key: 'T9_product_assouplissant',
    ok: assouplissantRows.length >= 1,
    details: `Found ${assouplissantRows.length} Assouplissant rows`,
    expected: '>=1',
    actual: assouplissantRows.length,
  });
  
  // T10: TOTAUX skipped
  const totauxRows = dataRows.filter(r => r[machineIdx]?.toUpperCase().includes('TOTAUX'));
  const totauxInDemarrage = demarrageRows.filter(r => r[machineIdx]?.toUpperCase().includes('TOTAUX'));
  tests.push({
    test_key: 'T10_totaux_skipped',
    ok: totauxRows.length === 1 && totauxInDemarrage.length === 0,
    details: `TOTAUX in data: ${totauxRows.length}, in filtered: ${totauxInDemarrage.length}`,
    expected: { inData: 1, inFiltered: 0 },
    actual: { inData: totauxRows.length, inFiltered: totauxInDemarrage.length },
  });
  
  const passed = tests.filter(t => t.ok).length;
  return {
    provider: 'wiline',
    tests,
    passed,
    failed: tests.length - passed,
  };
}

// Send alert via send-system-alert function
async function sendAlert(
  supabaseUrl: string,
  supabaseServiceKey: string,
  severity: 'error' | 'warn' | 'critical',
  code: string,
  message: string,
  meta: Record<string, unknown>
): Promise<void> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-system-alert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        id: Date.now(),
        created_at: new Date().toISOString(),
        env: 'prod',
        source: 'smoke_tests_import',
        severity,
        code,
        message,
        meta,
      }),
    });
    
    if (!response.ok) {
      console.error('[import-parser-tests-cron] Alert send failed:', await response.text());
    } else {
      console.log('[import-parser-tests-cron] Alert sent successfully');
    }
  } catch (error) {
    console.error('[import-parser-tests-cron] Error sending alert:', error);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify cron secret (allow manual trigger without secret for admin calls)
    const cronSecret = req.headers.get("x-cron-secret");
    const expectedSecret = Deno.env.get("CRON_SECRET");
    const authHeader = req.headers.get("authorization");
    
    // Allow if cron secret matches OR if there's a valid auth header (manual trigger)
    const isCronTrigger = cronSecret && cronSecret === expectedSecret;
    const isManualTrigger = authHeader?.startsWith("Bearer ");
    
    if (!isCronTrigger && !isManualTrigger) {
      console.error("[import-parser-tests-cron] Unauthorized access attempt");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("[import-parser-tests-cron] Starting import parser tests...");
    
    const startTime = Date.now();
    
    // Run tests
    const lmcontrolResults = runLMControlTests();
    const wilineResults = runWiLineTests();
    
    const totalTests = lmcontrolResults.tests.length + wilineResults.tests.length;
    const totalPassed = lmcontrolResults.passed + wilineResults.passed;
    const totalFailed = lmcontrolResults.failed + wilineResults.failed;
    const overallPassed = totalFailed === 0;
    const durationMs = Date.now() - startTime;
    
    console.log(`[import-parser-tests-cron] Tests complete: ${totalPassed}/${totalTests} passed in ${durationMs}ms`);
    
    // Gather failed tests for reporting
    const failedTests = [
      ...lmcontrolResults.tests.filter(t => !t.ok).map(t => ({ ...t, provider: 'lmcontrol' })),
      ...wilineResults.tests.filter(t => !t.ok).map(t => ({ ...t, provider: 'wiline' })),
    ];
    
    // Log to system_events
    if (overallPassed) {
      await supabase.rpc("rpc_log_system_event", {
        p_env: "prod",
        p_source: "smoke_tests_import",
        p_severity: "info",
        p_code: "IMPORT_PARSER_TESTS_SUCCESS",
        p_message: `Import parser tests: All ${totalTests} tests passed`,
        p_meta: {
          lmcontrol: { passed: lmcontrolResults.passed, failed: lmcontrolResults.failed },
          wiline: { passed: wilineResults.passed, failed: wilineResults.failed },
          duration_ms: durationMs,
          executed_at: new Date().toISOString(),
        },
      });
    } else {
      // Log failure
      await supabase.rpc("rpc_log_system_event", {
        p_env: "prod",
        p_source: "smoke_tests_import",
        p_severity: "error",
        p_code: "IMPORT_PARSER_TESTS_FAILED",
        p_message: `Import parser tests: ${totalFailed}/${totalTests} tests failed`,
        p_meta: {
          lmcontrol: { passed: lmcontrolResults.passed, failed: lmcontrolResults.failed },
          wiline: { passed: wilineResults.passed, failed: wilineResults.failed },
          failed_tests: failedTests,
          duration_ms: durationMs,
          executed_at: new Date().toISOString(),
        },
      });
      
      // Send email/Slack alert
      await sendAlert(
        supabaseUrl,
        supabaseServiceKey,
        'error',
        'IMPORT_PARSER_TESTS_FAILED',
        `Import parser tests failed: ${totalFailed}/${totalTests} tests failed`,
        {
          lmcontrol_failures: lmcontrolResults.failed,
          wiline_failures: wilineResults.failed,
          failed_tests: failedTests.map(t => `${t.provider}:${t.test_key}`),
          details: failedTests.slice(0, 5).map(t => ({
            provider: t.provider,
            test: t.test_key,
            details: t.details,
          })),
        }
      );
    }
    
    const response = {
      success: overallPassed,
      summary: {
        total_tests: totalTests,
        passed: totalPassed,
        failed: totalFailed,
        duration_ms: durationMs,
        executed_at: new Date().toISOString(),
      },
      lmcontrol: lmcontrolResults,
      wiline: wilineResults,
      failed_tests: failedTests,
    };
    
    console.log("[import-parser-tests-cron] Completed:", JSON.stringify(response.summary));

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[import-parser-tests-cron] Fatal error:", errorMessage);
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
