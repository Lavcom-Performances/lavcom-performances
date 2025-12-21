# Checklist SQL - Vérifications manuelles

Ce document contient les requêtes SQL à exécuter manuellement pour vérifier la configuration de sécurité.

## 1. Vérification RLS activée

```sql
-- Doit retourner TRUE pour toutes les tables critiques
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('sites', 'operations', 'import_batches', 'site_costs', 'user_goals', 'subscriptions', 'profiles')
ORDER BY tablename;
```

**Résultat attendu :** `rowsecurity = true` pour toutes les lignes.

---

## 2. Vérification des policies RLS

```sql
-- Liste toutes les policies sur les tables critiques
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual::text AS using_expression,
  with_check::text AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('sites', 'operations', 'import_batches', 'site_costs')
ORDER BY tablename, cmd;
```

**Vérifications :**
- `sites` : politique SELECT/INSERT/UPDATE/DELETE vérifiant `auth.uid() = user_id`
- `operations` : politique vérifiant `auth.uid() = user_id AND owns_site(site_id)`
- `import_batches` : politique vérifiant `auth.uid() = user_id AND owns_site(site_id)`

---

## 3. Test isolation inter-utilisateurs

```sql
-- Simuler l'accès User A essayant de lire les sites de User B
-- Exécuter avec le rôle anon et le JWT de User A

-- D'abord, identifier 2 users de test
SELECT id, email FROM auth.users LIMIT 5;

-- Puis vérifier qu'un user ne peut voir que ses propres sites
-- (cette requête doit être exécutée via l'API avec auth, pas en SQL direct)
```

---

## 4. Cascade delete : import_batches → operations

```sql
-- Vérifier que la suppression d'un import_batch supprime les operations associées
-- Test manuel :

-- 1. Créer un batch de test
INSERT INTO import_batches (user_id, site_id, filename, total_rows, imported_rows)
VALUES ('USER_ID_HERE', 'SITE_ID_HERE', 'test-cascade.csv', 10, 10)
RETURNING id;

-- 2. Créer quelques operations liées
INSERT INTO operations (user_id, site_id, import_batch_id, operation_date, amount, machine)
VALUES 
  ('USER_ID_HERE', 'SITE_ID_HERE', 'BATCH_ID_HERE', CURRENT_DATE, 5.00, 'TEST-01'),
  ('USER_ID_HERE', 'SITE_ID_HERE', 'BATCH_ID_HERE', CURRENT_DATE, 6.00, 'TEST-02');

-- 3. Supprimer le batch
DELETE FROM import_batches WHERE id = 'BATCH_ID_HERE';

-- 4. Vérifier que les operations ont été supprimées
SELECT COUNT(*) FROM operations WHERE import_batch_id = 'BATCH_ID_HERE';
-- Résultat attendu : 0
```

**Note :** Si le résultat est > 0, il manque une contrainte `ON DELETE CASCADE` sur la foreign key.

---

## 5. Filtrage is_demo

```sql
-- Vérifier que les sites démo sont correctement marqués
SELECT 
  id,
  name,
  is_demo,
  user_id
FROM sites
WHERE is_demo = true
LIMIT 10;

-- Vérifier qu'un user normal ne voit pas les sites démo des autres
-- (à tester via l'API, pas en SQL direct)
```

---

## 6. Rate limits : nettoyage automatique

```sql
-- Vérifier la fonction de cleanup
SELECT * FROM pg_proc WHERE proname = 'cleanup_old_rate_limits';

-- Vérifier les rate limits récents
SELECT 
  scope,
  identifier,
  count,
  window_start,
  updated_at
FROM rate_limits
ORDER BY updated_at DESC
LIMIT 20;

-- Vérifier qu'il n'y a pas de données trop anciennes (> 24h)
SELECT COUNT(*) 
FROM rate_limits 
WHERE window_start < NOW() - INTERVAL '24 hours';
-- Résultat attendu : 0 (ou proche de 0)
```

---

## 7. Fonction owns_site

```sql
-- Tester la fonction owns_site
-- Remplacer par des IDs réels

SELECT public.owns_site('SITE_ID_HERE'::uuid);
-- Résultat attendu : TRUE si le site appartient à l'utilisateur courant, FALSE sinon
```

---

## Checklist Responsive (Smoke visuel)

### Écrans à vérifier sur mobile (375px) et tablette (768px) :

| Écran | Mobile OK | Tablette OK | Notes |
|-------|-----------|-------------|-------|
| Login (`/login`) | ☐ | ☐ | Formulaire centré, pas de scroll horizontal |
| Signup (`/signup`) | ☐ | ☐ | Champs lisibles, bouton accessible |
| Import CSV (dialog) | ☐ | ☐ | Dropzone visible, preview table scroll OK |
| Multi-import wizard | ☐ | ☐ | Steps visibles, boutons sticky footer |
| Dashboard | ☐ | ☐ | KPIs empilés, charts redimensionnés |
| Comparatif sites | ☐ | ☐ | Table scroll horizontal, pas de débordement |
| Profil | ☐ | ☐ | Avatar upload, formulaire lisible |

### Points de contrôle :
- [ ] Aucun scroll horizontal non voulu
- [ ] Textes lisibles (min 14px)
- [ ] Boutons cliquables (min 44px touch target)
- [ ] Modales/sheets ne débordent pas
- [ ] Toasts visibles et lisibles
