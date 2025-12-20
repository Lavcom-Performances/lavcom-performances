-- ================================================================
-- TAEX-105 - Tests d'isolement Multi-Tenant (Version SQL)
-- Lavcom Performances - Audit RLS
-- ================================================================
--
-- PRÉREQUIS:
-- 1. Créer 2 utilisateurs de test via l'interface Auth Supabase
-- 2. Noter leurs UUIDs
-- 3. Exécuter ce script en remplaçant les placeholders
--
-- ================================================================

-- REMPLACER CES VALEURS PAR LES UUIDs RÉELS DES UTILISATEURS DE TEST
DO $$
DECLARE
  v_user_a_id UUID := '00000000-0000-0000-0000-000000000001'; -- REMPLACER
  v_user_b_id UUID := '00000000-0000-0000-0000-000000000002'; -- REMPLACER
  v_site_a_id UUID;
  v_site_b_id UUID;
  v_test_count INT := 0;
  v_pass_count INT := 0;
BEGIN
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  RAISE NOTICE 'TAEX-105 - Tests d''isolement Multi-Tenant (SQL)';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  RAISE NOTICE '';

  -- ================================================================
  -- SETUP: Créer des données de test
  -- ================================================================
  RAISE NOTICE 'SETUP: Création des données de test...';
  
  -- Site pour User A
  INSERT INTO public.sites (user_id, name, city, postal_code)
  VALUES (v_user_a_id, 'Test Site A', 'Paris', '75001')
  RETURNING id INTO v_site_a_id;
  RAISE NOTICE 'Site A créé: %', v_site_a_id;
  
  -- Site pour User B
  INSERT INTO public.sites (user_id, name, city, postal_code)
  VALUES (v_user_b_id, 'Test Site B', 'Lyon', '69001')
  RETURNING id INTO v_site_b_id;
  RAISE NOTICE 'Site B créé: %', v_site_b_id;
  
  -- Opération pour User A
  INSERT INTO public.operations (user_id, site_id, operation_date, amount, machine, program, payment_mode)
  VALUES (v_user_a_id, v_site_a_id, CURRENT_DATE, 5.00, 'LL-01', 'Lavage 40°', 'CB');
  
  -- Import batch pour User A
  INSERT INTO public.import_batches (user_id, site_id, filename, total_rows, imported_rows, ignored_rows)
  VALUES (v_user_a_id, v_site_a_id, 'test-a.csv', 5, 5, 0);
  
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  RAISE NOTICE 'TESTS RLS (vérification des policies)';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  RAISE NOTICE '';

  -- ================================================================
  -- TEST 1: Fonction owns_site() existe et fonctionne
  -- ================================================================
  v_test_count := v_test_count + 1;
  BEGIN
    -- Simuler le contexte de User A
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_a_id)::text, true);
    
    IF public.owns_site(v_site_a_id) = true THEN
      v_pass_count := v_pass_count + 1;
      RAISE NOTICE '✅ TEST 1: owns_site() retourne true pour le propre site';
    ELSE
      RAISE NOTICE '❌ TEST 1: owns_site() devrait retourner true pour le propre site';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ TEST 1: Erreur - %', SQLERRM;
  END;
  
  -- ================================================================
  -- TEST 2: owns_site() retourne false pour site étranger
  -- ================================================================
  v_test_count := v_test_count + 1;
  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_a_id)::text, true);
    
    IF public.owns_site(v_site_b_id) = false THEN
      v_pass_count := v_pass_count + 1;
      RAISE NOTICE '✅ TEST 2: owns_site() retourne false pour site étranger';
    ELSE
      RAISE NOTICE '❌ TEST 2: FAILLE - owns_site() retourne true pour site étranger!';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ TEST 2: Erreur - %', SQLERRM;
  END;

  -- ================================================================
  -- TEST 3: Vérifier que RLS est activée sur toutes les tables
  -- ================================================================
  v_test_count := v_test_count + 1;
  DECLARE
    v_tables_without_rls TEXT := '';
    v_table RECORD;
  BEGIN
    FOR v_table IN
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
        AND tablename IN ('sites', 'operations', 'import_batches', 'profiles', 'site_costs', 'subscriptions', 'user_goals')
        AND tablename NOT IN (
          SELECT tablename 
          FROM pg_tables t
          JOIN pg_class c ON c.relname = t.tablename
          WHERE t.schemaname = 'public'
            AND c.relrowsecurity = true
        )
    LOOP
      v_tables_without_rls := v_tables_without_rls || v_table.tablename || ', ';
    END LOOP;
    
    IF v_tables_without_rls = '' THEN
      v_pass_count := v_pass_count + 1;
      RAISE NOTICE '✅ TEST 3: RLS activée sur toutes les tables principales';
    ELSE
      RAISE NOTICE '❌ TEST 3: FAILLE - RLS désactivée sur: %', v_tables_without_rls;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ TEST 3: Erreur - %', SQLERRM;
  END;

  -- ================================================================
  -- TEST 4: Vérifier les policies SELECT sur operations
  -- ================================================================
  v_test_count := v_test_count + 1;
  DECLARE
    v_policy_exists BOOLEAN;
  BEGIN
    SELECT EXISTS(
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
        AND tablename = 'operations' 
        AND cmd = 'SELECT'
        AND qual LIKE '%owns_site%'
    ) INTO v_policy_exists;
    
    IF v_policy_exists THEN
      v_pass_count := v_pass_count + 1;
      RAISE NOTICE '✅ TEST 4: Policy SELECT sur operations utilise owns_site()';
    ELSE
      RAISE NOTICE '❌ TEST 4: Policy SELECT sur operations n''utilise pas owns_site()';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ TEST 4: Erreur - %', SQLERRM;
  END;

  -- ================================================================
  -- TEST 5: Vérifier les policies sur import_batches
  -- ================================================================
  v_test_count := v_test_count + 1;
  DECLARE
    v_policy_count INT;
  BEGIN
    SELECT COUNT(*) INTO v_policy_count
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'import_batches' 
      AND qual LIKE '%owns_site%';
    
    IF v_policy_count >= 3 THEN -- SELECT, INSERT, DELETE minimum
      v_pass_count := v_pass_count + 1;
      RAISE NOTICE '✅ TEST 5: import_batches a % policies avec owns_site()', v_policy_count;
    ELSE
      RAISE NOTICE '❌ TEST 5: import_batches n''a que % policies avec owns_site()', v_policy_count;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ TEST 5: Erreur - %', SQLERRM;
  END;

  -- ================================================================
  -- TEST 6: Vérifier les policies sur site_costs
  -- ================================================================
  v_test_count := v_test_count + 1;
  DECLARE
    v_policy_count INT;
  BEGIN
    SELECT COUNT(*) INTO v_policy_count
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'site_costs' 
      AND qual LIKE '%owns_site%';
    
    IF v_policy_count >= 4 THEN
      v_pass_count := v_pass_count + 1;
      RAISE NOTICE '✅ TEST 6: site_costs a % policies avec owns_site()', v_policy_count;
    ELSE
      RAISE NOTICE '❌ TEST 6: site_costs n''a que % policies avec owns_site()', v_policy_count;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ TEST 6: Erreur - %', SQLERRM;
  END;

  -- ================================================================
  -- CLEANUP
  -- ================================================================
  RAISE NOTICE '';
  RAISE NOTICE 'CLEANUP: Suppression des données de test...';
  
  DELETE FROM public.operations WHERE site_id IN (v_site_a_id, v_site_b_id);
  DELETE FROM public.import_batches WHERE site_id IN (v_site_a_id, v_site_b_id);
  DELETE FROM public.sites WHERE id IN (v_site_a_id, v_site_b_id);
  
  RAISE NOTICE 'Cleanup terminé';
  
  -- ================================================================
  -- RÉSUMÉ
  -- ================================================================
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  RAISE NOTICE 'RÉSUMÉ DES TESTS';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  RAISE NOTICE 'Total: % tests', v_test_count;
  RAISE NOTICE 'Réussis: %', v_pass_count;
  RAISE NOTICE 'Échoués: %', v_test_count - v_pass_count;
  RAISE NOTICE '';
  
  IF v_pass_count = v_test_count THEN
    RAISE NOTICE '✅ TOUS LES TESTS PASSENT';
  ELSE
    RAISE NOTICE '⚠️ CERTAINS TESTS ONT ÉCHOUÉ - VÉRIFICATION MANUELLE REQUISE';
  END IF;
  
END $$;

-- ================================================================
-- CHECKLIST MANUELLE (à exécuter avec les 2 utilisateurs connectés)
-- ================================================================
/*

CHECKLIST DE VÉRIFICATION MANUELLE:

□ 1. Connexion User A
   - Aller sur /select-laundromat
   - Vérifier qu'on ne voit PAS les sites de User B
   
□ 2. Connexion User A
   - Aller sur /dashboard avec un site
   - Vérifier que les données affichées sont uniquement celles du site A
   
□ 3. Tentative d'accès direct (User A)
   - Modifier l'URL en ajoutant ?site=<ID_SITE_B>
   - Vérifier que l'accès est refusé ou redirigé
   
□ 4. Import CSV (User A)
   - Importer un fichier CSV
   - Vérifier que les opérations sont liées au bon site
   
□ 5. Historique imports (User A)
   - Aller sur la page d'historique
   - Vérifier qu'on ne voit PAS les imports de User B
   
□ 6. Export PDF (User A)
   - Générer un export PDF
   - Vérifier qu'il ne contient que les données de User A
   
□ 7. Suppression batch (User A)
   - Tenter de supprimer un batch
   - Vérifier qu'on ne peut supprimer que ses propres batches

*/
