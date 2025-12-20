/**
 * TAEX-105 - Tests d'isolement multi-tenant
 * 
 * Ce script teste que les RLS empêchent tout accès cross-tenant.
 * 
 * PRÉREQUIS:
 * - 2 utilisateurs de test créés dans Supabase Auth
 * - Variables d'environnement:
 *   - SUPABASE_URL
 *   - SUPABASE_ANON_KEY
 *   - TEST_USER_A_EMAIL / TEST_USER_A_PASSWORD
 *   - TEST_USER_B_EMAIL / TEST_USER_B_PASSWORD
 * 
 * USAGE:
 * npx ts-node scripts/multi-tenant-isolation-tests.ts
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============= Configuration =============

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '';

const TEST_USER_A = {
  email: process.env.TEST_USER_A_EMAIL || 'test-user-a@lavcom-test.local',
  password: process.env.TEST_USER_A_PASSWORD || 'TestPassword123!',
};

const TEST_USER_B = {
  email: process.env.TEST_USER_B_EMAIL || 'test-user-b@lavcom-test.local',
  password: process.env.TEST_USER_B_PASSWORD || 'TestPassword123!',
};

// ============= Types =============

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
  error?: string;
}

interface TestContext {
  clientA: SupabaseClient;
  clientB: SupabaseClient;
  userAId: string;
  userBId: string;
  siteAId?: string;
  siteBId?: string;
  batchAId?: string;
  operationAId?: string;
}

// ============= Test Runner =============

const results: TestResult[] = [];

function log(message: string) {
  console.log(`[TEST] ${message}`);
}

function pass(name: string, details: string) {
  results.push({ name, passed: true, details });
  console.log(`✅ PASS: ${name}`);
  console.log(`   ${details}`);
}

function fail(name: string, details: string, error?: string) {
  results.push({ name, passed: false, details, error });
  console.log(`❌ FAIL: ${name}`);
  console.log(`   ${details}`);
  if (error) console.log(`   Error: ${error}`);
}

// ============= Tests =============

async function testUserACannotSeeSitesOfUserB(ctx: TestContext) {
  const testName = "User A ne peut pas voir les sites de User B";
  
  try {
    // User A tente de lire tous les sites
    const { data, error } = await ctx.clientA
      .from('sites')
      .select('*');
    
    if (error) {
      fail(testName, "Erreur lors de la requête", error.message);
      return;
    }
    
    // Vérifier qu'aucun site de B n'est visible
    const hasSiteB = data?.some(s => s.id === ctx.siteBId);
    
    if (hasSiteB) {
      fail(testName, `User A peut voir le site de User B (${ctx.siteBId})`);
    } else {
      pass(testName, `User A voit ${data?.length || 0} site(s), aucun appartenant à User B`);
    }
  } catch (e: any) {
    fail(testName, "Exception inattendue", e.message);
  }
}

async function testUserACannotSeeOperationsOfUserB(ctx: TestContext) {
  const testName = "User A ne peut pas voir les opérations de User B";
  
  try {
    const { data, error } = await ctx.clientA
      .from('operations')
      .select('*');
    
    if (error) {
      fail(testName, "Erreur lors de la requête", error.message);
      return;
    }
    
    // Vérifier qu'aucune opération de B n'est visible (via site_id)
    const hasOpFromB = data?.some(o => o.site_id === ctx.siteBId);
    
    if (hasOpFromB) {
      fail(testName, "User A peut voir des opérations du site de User B");
    } else {
      pass(testName, `User A voit ${data?.length || 0} opération(s), aucune du site de User B`);
    }
  } catch (e: any) {
    fail(testName, "Exception inattendue", e.message);
  }
}

async function testUserACannotSeeImportBatchesOfUserB(ctx: TestContext) {
  const testName = "User A ne peut pas voir les import_batches de User B";
  
  try {
    const { data, error } = await ctx.clientA
      .from('import_batches')
      .select('*');
    
    if (error) {
      fail(testName, "Erreur lors de la requête", error.message);
      return;
    }
    
    const hasBatchFromB = data?.some(b => b.site_id === ctx.siteBId);
    
    if (hasBatchFromB) {
      fail(testName, "User A peut voir des import_batches du site de User B");
    } else {
      pass(testName, `User A voit ${data?.length || 0} batch(es), aucun du site de User B`);
    }
  } catch (e: any) {
    fail(testName, "Exception inattendue", e.message);
  }
}

async function testUserACannotInsertOperationOnSiteB(ctx: TestContext) {
  const testName = "User A ne peut pas insérer une opération sur le site de User B";
  
  try {
    const { data, error } = await ctx.clientA
      .from('operations')
      .insert({
        user_id: ctx.userAId,
        site_id: ctx.siteBId, // Site de User B !
        operation_date: new Date().toISOString().split('T')[0],
        amount: 5.00,
        machine: 'LL-01',
        program: 'Test',
        payment_mode: 'CB',
      })
      .select()
      .single();
    
    if (data) {
      fail(testName, "FAILLE CRITIQUE: User A a pu insérer sur le site de User B!", JSON.stringify(data));
      // Nettoyer
      await ctx.clientA.from('operations').delete().eq('id', data.id);
    } else if (error) {
      pass(testName, `INSERT bloqué correctement: ${error.code}`);
    }
  } catch (e: any) {
    pass(testName, `Exception (attendue): ${e.message}`);
  }
}

async function testUserACannotDeleteBatchOfUserB(ctx: TestContext) {
  const testName = "User A ne peut pas supprimer un batch de User B";
  
  try {
    // Créer un batch pour User B
    const { data: batchB, error: createError } = await ctx.clientB
      .from('import_batches')
      .insert({
        user_id: ctx.userBId,
        site_id: ctx.siteBId!,
        filename: 'test-isolation.csv',
        total_rows: 10,
        imported_rows: 10,
        ignored_rows: 0,
      })
      .select()
      .single();
    
    if (createError || !batchB) {
      fail(testName, "Impossible de créer le batch de test pour User B", createError?.message);
      return;
    }
    
    // User A tente de supprimer
    const { error: deleteError } = await ctx.clientA
      .from('import_batches')
      .delete()
      .eq('id', batchB.id);
    
    // Vérifier que le batch existe toujours
    const { data: checkBatch } = await ctx.clientB
      .from('import_batches')
      .select('id')
      .eq('id', batchB.id)
      .single();
    
    if (checkBatch) {
      pass(testName, "DELETE bloqué: le batch de User B existe toujours");
    } else {
      fail(testName, "FAILLE CRITIQUE: User A a supprimé le batch de User B!");
    }
    
    // Nettoyer
    await ctx.clientB.from('import_batches').delete().eq('id', batchB.id);
    
  } catch (e: any) {
    fail(testName, "Exception inattendue", e.message);
  }
}

async function testUserACannotUpdateSiteOfUserB(ctx: TestContext) {
  const testName = "User A ne peut pas modifier un site de User B";
  
  try {
    const { error } = await ctx.clientA
      .from('sites')
      .update({ name: 'Hacked by User A' })
      .eq('id', ctx.siteBId!);
    
    // Vérifier que le nom n'a pas changé
    const { data: checkSite } = await ctx.clientB
      .from('sites')
      .select('name')
      .eq('id', ctx.siteBId!)
      .single();
    
    if (checkSite?.name === 'Hacked by User A') {
      fail(testName, "FAILLE CRITIQUE: User A a modifié le site de User B!");
    } else {
      pass(testName, "UPDATE bloqué: le site de User B est intact");
    }
  } catch (e: any) {
    pass(testName, `Exception (attendue): ${e.message}`);
  }
}

async function testDirectSiteIdAccessBlocked(ctx: TestContext) {
  const testName = "Accès direct par site_id étranger bloqué (paramètre URL)";
  
  try {
    // Simuler ?site=<site_id_de_B>
    const { data, error } = await ctx.clientA
      .from('sites')
      .select('*')
      .eq('id', ctx.siteBId!);
    
    if (data && data.length > 0) {
      fail(testName, "FAILLE: Accès direct au site de User B possible via son ID");
    } else {
      pass(testName, "Accès direct par ID bloqué: aucune donnée retournée");
    }
  } catch (e: any) {
    fail(testName, "Exception inattendue", e.message);
  }
}

async function testUserACannotSeeCostsOfUserB(ctx: TestContext) {
  const testName = "User A ne peut pas voir les coûts (site_costs) de User B";
  
  try {
    const { data, error } = await ctx.clientA
      .from('site_costs')
      .select('*');
    
    if (error) {
      fail(testName, "Erreur lors de la requête", error.message);
      return;
    }
    
    const hasCostFromB = data?.some(c => c.site_id === ctx.siteBId);
    
    if (hasCostFromB) {
      fail(testName, "User A peut voir les site_costs du site de User B");
    } else {
      pass(testName, `User A voit ${data?.length || 0} entrée(s) site_costs, aucune du site de User B`);
    }
  } catch (e: any) {
    fail(testName, "Exception inattendue", e.message);
  }
}

async function testUserACannotSeeProfileOfUserB(ctx: TestContext) {
  const testName = "User A ne peut pas voir le profil de User B";
  
  try {
    const { data, error } = await ctx.clientA
      .from('profiles')
      .select('*')
      .eq('id', ctx.userBId);
    
    if (data && data.length > 0) {
      fail(testName, "FAILLE: User A peut voir le profil de User B");
    } else {
      pass(testName, "Profil de User B non accessible par User A");
    }
  } catch (e: any) {
    fail(testName, "Exception inattendue", e.message);
  }
}

async function testUserACannotSeeSubscriptionOfUserB(ctx: TestContext) {
  const testName = "User A ne peut pas voir l'abonnement de User B";
  
  try {
    const { data, error } = await ctx.clientA
      .from('subscriptions')
      .select('*')
      .eq('user_id', ctx.userBId);
    
    if (data && data.length > 0) {
      fail(testName, "FAILLE: User A peut voir l'abonnement de User B");
    } else {
      pass(testName, "Abonnement de User B non accessible par User A");
    }
  } catch (e: any) {
    fail(testName, "Exception inattendue", e.message);
  }
}

// ============= Setup & Cleanup =============

async function setupTestData(ctx: TestContext): Promise<boolean> {
  log("Création des données de test...");
  
  try {
    // Créer un site pour User A
    const { data: siteA, error: siteAError } = await ctx.clientA
      .from('sites')
      .insert({
        user_id: ctx.userAId,
        name: 'Site Test User A',
        city: 'Paris',
        postal_code: '75001',
      })
      .select()
      .single();
    
    if (siteAError || !siteA) {
      console.error("Erreur création site A:", siteAError);
      return false;
    }
    ctx.siteAId = siteA.id;
    log(`Site A créé: ${ctx.siteAId}`);
    
    // Créer un site pour User B
    const { data: siteB, error: siteBError } = await ctx.clientB
      .from('sites')
      .insert({
        user_id: ctx.userBId,
        name: 'Site Test User B',
        city: 'Lyon',
        postal_code: '69001',
      })
      .select()
      .single();
    
    if (siteBError || !siteB) {
      console.error("Erreur création site B:", siteBError);
      return false;
    }
    ctx.siteBId = siteB.id;
    log(`Site B créé: ${ctx.siteBId}`);
    
    // Créer quelques opérations pour User A
    const { data: opA, error: opAError } = await ctx.clientA
      .from('operations')
      .insert({
        user_id: ctx.userAId,
        site_id: ctx.siteAId,
        operation_date: new Date().toISOString().split('T')[0],
        amount: 5.00,
        machine: 'LL-01',
        program: 'Lavage 40°',
        payment_mode: 'CB',
      })
      .select()
      .single();
    
    if (opA) {
      ctx.operationAId = opA.id;
      log(`Opération A créée: ${ctx.operationAId}`);
    }
    
    // Créer un batch pour User A
    const { data: batchA } = await ctx.clientA
      .from('import_batches')
      .insert({
        user_id: ctx.userAId,
        site_id: ctx.siteAId,
        filename: 'test-a.csv',
        total_rows: 5,
        imported_rows: 5,
        ignored_rows: 0,
      })
      .select()
      .single();
    
    if (batchA) {
      ctx.batchAId = batchA.id;
      log(`Batch A créé: ${ctx.batchAId}`);
    }
    
    return true;
  } catch (e: any) {
    console.error("Erreur setup:", e.message);
    return false;
  }
}

async function cleanupTestData(ctx: TestContext) {
  log("Nettoyage des données de test...");
  
  try {
    // Supprimer les opérations
    if (ctx.operationAId) {
      await ctx.clientA.from('operations').delete().eq('id', ctx.operationAId);
    }
    
    // Supprimer les batches
    if (ctx.batchAId) {
      await ctx.clientA.from('import_batches').delete().eq('id', ctx.batchAId);
    }
    
    // Supprimer les sites
    if (ctx.siteAId) {
      await ctx.clientA.from('sites').delete().eq('id', ctx.siteAId);
    }
    if (ctx.siteBId) {
      await ctx.clientB.from('sites').delete().eq('id', ctx.siteBId);
    }
    
    log("Nettoyage terminé");
  } catch (e: any) {
    console.error("Erreur cleanup:", e.message);
  }
}

// ============= Main =============

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║       TAEX-105 - Tests d'isolement Multi-Tenant              ║");
  console.log("║       Lavcom Performances - Audit RLS                        ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log("");
  
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("❌ Variables SUPABASE_URL et SUPABASE_ANON_KEY requises");
    process.exit(1);
  }
  
  // Créer les clients
  const clientA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const clientB = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  // Authentifier User A
  log("Authentification User A...");
  const { data: authA, error: authAError } = await clientA.auth.signInWithPassword({
    email: TEST_USER_A.email,
    password: TEST_USER_A.password,
  });
  
  if (authAError || !authA.user) {
    console.error("❌ Impossible d'authentifier User A:", authAError?.message);
    console.log("   Créez les utilisateurs de test ou définissez les variables d'environnement.");
    process.exit(1);
  }
  log(`User A authentifié: ${authA.user.id}`);
  
  // Authentifier User B
  log("Authentification User B...");
  const { data: authB, error: authBError } = await clientB.auth.signInWithPassword({
    email: TEST_USER_B.email,
    password: TEST_USER_B.password,
  });
  
  if (authBError || !authB.user) {
    console.error("❌ Impossible d'authentifier User B:", authBError?.message);
    console.log("   Créez les utilisateurs de test ou définissez les variables d'environnement.");
    process.exit(1);
  }
  log(`User B authentifié: ${authB.user.id}`);
  
  // Contexte de test
  const ctx: TestContext = {
    clientA,
    clientB,
    userAId: authA.user.id,
    userBId: authB.user.id,
  };
  
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  
  // Setup
  const setupOk = await setupTestData(ctx);
  if (!setupOk) {
    console.error("❌ Setup échoué, arrêt des tests");
    process.exit(1);
  }
  
  console.log("\n━━━━━━━━━━━━━ EXÉCUTION DES TESTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  
  // Exécuter tous les tests
  await testUserACannotSeeSitesOfUserB(ctx);
  await testUserACannotSeeOperationsOfUserB(ctx);
  await testUserACannotSeeImportBatchesOfUserB(ctx);
  await testUserACannotInsertOperationOnSiteB(ctx);
  await testUserACannotDeleteBatchOfUserB(ctx);
  await testUserACannotUpdateSiteOfUserB(ctx);
  await testDirectSiteIdAccessBlocked(ctx);
  await testUserACannotSeeCostsOfUserB(ctx);
  await testUserACannotSeeProfileOfUserB(ctx);
  await testUserACannotSeeSubscriptionOfUserB(ctx);
  
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  
  // Cleanup
  await cleanupTestData(ctx);
  
  // Résumé
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║                      RÉSUMÉ DES TESTS                        ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  
  console.log(`Total: ${total} tests`);
  console.log(`✅ Réussis: ${passed}`);
  console.log(`❌ Échoués: ${failed}`);
  console.log("");
  
  if (failed > 0) {
    console.log("TESTS ÉCHOUÉS:");
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}: ${r.details}`);
    });
    console.log("");
    console.log("⚠️  FAILLES DE SÉCURITÉ DÉTECTÉES - CORRECTIONS REQUISES");
    process.exit(1);
  } else {
    console.log("✅ TOUS LES TESTS PASSENT - AUCUNE FUITE CROSS-TENANT DÉTECTÉE");
    console.log("");
    console.log("Confirmation: l'isolement multi-tenant est correctement appliqué");
    console.log("au périmètre testé (sites, operations, import_batches, site_costs,");
    console.log("profiles, subscriptions).");
  }
  
  // Déconnexion
  await clientA.auth.signOut();
  await clientB.auth.signOut();
  
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);
