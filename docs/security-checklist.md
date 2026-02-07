# Security Checklist - Pre-Production Runbook

Ce document liste les vérifications de sécurité à effectuer avant chaque mise en production.

---

## 0. Backups & Disaster Recovery (TAEX-304)

### ✅ Configuration des sauvegardes
| Élément | Statut | Détails |
|---------|--------|---------|
| **Backups quotidiens** | ✅ Actif | Lovable Cloud fournit des backups automatiques quotidiens |
| **Rétention** | ✅ ≥30 jours | Point-in-time recovery disponible |
| **Stockage séparé** | ✅ Oui | Backups stockés sur infrastructure distincte |

### 🔄 Historique des tests de restauration

| Date | Environnement | Durée | Tables vérifiées | Résultat | Opérateur |
|------|---------------|-------|------------------|----------|-----------|
| _YYYY-MM-DD_ | staging | _Xmin_ | operations, fin_projects, sites, trust_day | ⏳ À effectuer | — |

> **Action requise** : Effectuer un restore test avant validation TAEX-304.
> 
> **Procédure** :
> 1. Accéder à Lovable Cloud > Database > Backups
> 2. Sélectionner un backup récent
> 3. Restaurer vers un environnement de staging/test
> 4. Vérifier les tables critiques : `operations`, `fin_projects`, `sites`, `trust_day`, `import_batches`
> 5. Comparer les volumes (COUNT) avec la production
> 6. Documenter le résultat ci-dessus

### Modèle de confirmation post-restore

```
Backup restored on [DATE] at [TIME].
Environment: staging
Duration: [X] minutes
Tables verified:
  - operations: [COUNT] rows ✓
  - fin_projects: [COUNT] rows ✓
  - sites: [COUNT] rows ✓
  - trust_day: [COUNT] rows ✓
  - import_batches: [COUNT] rows ✓
Result: SUCCESS / FAILURE
Operator: [NAME]
```

---

## 1. Authentification & Comptes

### ✅ Configuration Auth Supabase
- [ ] **Auto-confirm email** : Désactivé en production (activé uniquement en dev)
- [ ] **Leaked password protection** : Activé dans Auth Settings → Security
- [ ] **Rate limiting signup/login** : Vérifié via edge function `auth-signup`
- [ ] **Password strength** : Minimum 8 caractères avec indicateur de force

### ✅ MFA (Two-Factor Authentication)
- [ ] MFA disponible et fonctionnel pour tous les utilisateurs
- [ ] Re-authentification requise pour les actions sensibles (changement mot de passe, désactivation MFA)

## 2. Row-Level Security (RLS)

### ✅ Tables critiques avec RLS activée
```sql
-- Vérifier que RLS est activée
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

| Table | RLS Activée | Politiques |
|-------|-------------|------------|
| sites | ✅ | CRUD restreint à `auth.uid() = user_id` |
| operations | ✅ | CRUD restreint à `auth.uid() = user_id AND owns_site(site_id)` |
| import_batches | ✅ | CRUD restreint à `auth.uid() = user_id AND owns_site(site_id)` |
| profiles | ✅ | SELECT/UPDATE/INSERT restreint à `auth.uid() = id` |
| subscriptions | ✅ | SELECT/UPDATE restreint à `auth.uid() = user_id` |
| site_costs | ✅ | CRUD restreint à `auth.uid() = user_id AND owns_site(site_id)` |
| user_goals | ✅ | CRUD restreint à `auth.uid() = user_id` |
| rate_limits | ✅ | Accès service role uniquement |

### ✅ Test d'isolation multi-tenant
```sql
-- Exécuter en tant qu'utilisateur A, ne doit PAS voir les sites de B
SELECT * FROM sites WHERE user_id != auth.uid();
-- Résultat attendu : 0 lignes
```

## 3. Rate Limiting

### ✅ Limites configurées
| Scope | Limite | Fenêtre |
|-------|--------|---------|
| Login | 5 tentatives | 15 min |
| Signup | 3 comptes | 1 heure |
| Import CSV (par site) | 1 import | 2 min |
| Import CSV (par user) | 10 imports | 1 heure |
| Create Demo | 1 création | 24 heures |
| Fetch SIRET | 10 requêtes | 5 min |

### ✅ Vérification Edge Functions
- [ ] `auth-signup` : Rate limit actif
- [ ] `import-csv-check` : Rate limit + ownership check
- [ ] `create-demo` : Rate limit actif
- [ ] `fetch-from-siret` : Rate limit actif

## 4. Logs & Données Sensibles

### ✅ Aucune donnée sensible en clair
- [ ] Pas d'IP complète dans les logs (utiliser hash)
- [ ] Pas d'email complet dans les logs (masquer avec `***`)
- [ ] Pas de mot de passe dans les logs
- [ ] Pas de tokens/secrets dans le code frontend

### ✅ Vérification des logs
```typescript
// ❌ INTERDIT
console.log(`User ${email} from IP ${ip}`);

// ✅ CORRECT
console.log(`User ${email.replace(/(.{2}).*@/, '$1***@')} attempted login`);
```

## 5. Storage (Buckets)

### ✅ Configuration des buckets
| Bucket | Public | Politiques |
|--------|--------|------------|
| avatars | ✅ Oui | Upload restreint à `auth.uid()` |

## 6. Edge Functions

### ✅ Vérifications communes
- [ ] CORS configuré correctement
- [ ] Headers de sécurité présents
- [ ] Validation des inputs
- [ ] Gestion des erreurs sans leak d'info sensible

## 7. Frontend

### ✅ Bonnes pratiques
- [ ] Pas de secrets/API keys dans le code client
- [ ] Validation côté client ET serveur
- [ ] Messages d'erreur non-révélateurs
- [ ] HTTPS obligatoire

## 8. Checklist Responsive

### ✅ Écrans critiques testés mobile/desktop
- [ ] Login / Signup
- [ ] Import CSV (dialog + wizard multi-fichiers)
- [ ] Dashboard
- [ ] Comparaison de sites
- [ ] Profil utilisateur

## Commandes utiles

### Lancer les tests QA
```bash
# Configurer les variables d'environnement
cp .env.qa.example .env.qa
# Éditer .env.qa avec les credentials de test

# Exécuter les tests
source .env.qa && npx ts-node scripts/qa/smoke.ts
```

### Vérifier les politiques RLS
```sql
SELECT schemaname, tablename, policyname, permissive, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### Nettoyer les rate limits expirés
```sql
SELECT cleanup_old_rate_limits();
```

---

**Dernière mise à jour** : 2024-12-21

**Responsable** : Équipe Sécurité Lavcom
