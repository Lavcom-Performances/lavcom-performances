# Security Checklist — Pre-Production Runbook

> Vérifications obligatoires **avant chaque mise en production** majeure.
> Régénéré à partir du code source actuel (91 edge functions, 83 tables publiques).

---

## 0. Backups & Disaster Recovery (TAEX-304)

### 0.1 Configuration

| Élément | Statut | Détails |
|---------|--------|---------|
| **Backups quotidiens** | ✅ Actif | Lovable Cloud — automatique |
| **Rétention** | ✅ ≥ 30 j | Point-in-time recovery |
| **Stockage séparé** | ✅ Oui | Infrastructure distincte |
| **DR Drill mensuel** | ✅ `dr-drill-reminder` cron | `run-dr-drill` + ScreenshotOne + SHA256 |

### 0.2 Historique restore

| Date | Env | Durée | Tables vérifiées | Résultat | Opérateur |
|------|-----|-------|------------------|----------|-----------|
| 2026-02-07 | staging | ~8 min | operations, fin_projects, sites, trust_day, import_batches, system_events | ✅ Success | Lovable AI |

### 0.3 Procédure restore test

1. Lovable Cloud → Database → Backups
2. Sélectionner backup ≤ 7 j
3. Restaurer vers staging
4. Vérifier (`COUNT(*)` vs prod) : `operations`, `fin_projects`, `sites`, `trust_day`, `import_batches`, `subscriptions`, `purchases`
5. Documenter dans `dr_drill_runs` + ce tableau

### 0.4 Modèle confirmation

```
Backup restored on [DATE] at [TIME].
Environment: staging
Duration: [X] minutes
Tables verified:
  - operations: [COUNT] ✓
  - fin_projects: [COUNT] ✓
  - sites: [COUNT] ✓
  - trust_day: [COUNT] ✓
  - import_batches: [COUNT] ✓
Result: SUCCESS / FAILURE
Operator: [NAME]
```

---

## 1. Authentification & comptes

- [ ] **Auto-confirm email** désactivé en production
- [ ] **Leaked password protection** activé (Auth → Security)
- [ ] **Password strength** ≥ 8 caractères + indicateur
- [ ] **MFA** disponible & testé (enroll + verify + recovery codes)
- [ ] **Re-auth** requise sur : changement password, désactivation MFA, suppression compte
- [ ] **OTP email** déclenché sur device inconnu (≥ 90 j) ou changement pays
- [ ] **Trusted devices** : `remove-trusted-device` testé
- [ ] **Sessions** : `revoke-other-sessions` testé
- [ ] **Rate limit** signup/login vérifié (`auth-signup`, `log-login`)

---

## 2. Row-Level Security (RLS)

### 2.1 Activation globale

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = false;
-- Résultat attendu : 0 lignes
```

### 2.2 Tables critiques

| Table | RLS | Politique |
|-------|-----|-----------|
| `sites` | ✅ | `auth.uid() = user_id AND deleted_at IS NULL` |
| `operations` | ✅ | `owns_operation_site(site_id)` |
| `import_batches` | ✅ | `auth.uid() = user_id AND owns_site(site_id)` |
| `profiles` | ✅ | `auth.uid() = id` |
| `subscriptions` | ✅ | `auth.uid() = user_id` |
| `purchases` | ✅ | `auth.uid() = user_id` |
| `site_costs` | ✅ | `owns_site(site_id)` |
| `site_access` | ✅ | `owns_site(site_id)` ou self |
| `kpi_objectives` | ✅ | `owns_site(site_id)` |
| `analytics_daily` / `analytics_kpis` | ✅ | `owns_site(site_id)` |
| `user_goals` / `user_chart_preferences` / `notification_preferences` | ✅ | `auth.uid() = user_id` |
| `fin_workspaces` | ✅ | `auth.uid() = owner_user_id` |
| `fin_projects` / `fin_scenarios` / `fin_line_items` / `fin_hypotheses` / `fin_forecasts` / `fin_exports` | ✅ | Membership via `fin_workspaces` |
| `team_invitations` | ✅ | Invitee + inviter |
| `audit_logs` / `admin_audit_logs` / `system_events` / `cron_logs` | ✅ | Lecture super_admin only |
| `rate_limits` / `mfa_challenges` / `auth_login_otps` | ✅ | Service role only |
| `paywall_bypass_allowlist` | ✅ | Service role read; admin write |
| `platform_roles` / `user_roles` / `user_permissions` | ✅ | Self-read, super_admin write |

### 2.3 Test isolation multi-tenant

```sql
-- Connecté en tant que user A — doit retourner 0 lignes
SELECT COUNT(*) FROM sites WHERE user_id != auth.uid();
SELECT COUNT(*) FROM operations o
  WHERE NOT EXISTS (SELECT 1 FROM sites s WHERE s.id = o.site_id AND s.user_id = auth.uid());
```

---

## 3. Rate limiting

| Scope | Limite | Fenêtre | Edge function |
|-------|--------|---------|---------------|
| Login | 5 | 15 min | `log-login` / `log-login-event` |
| Signup | 3 | 1 h | `auth-signup` |
| Import CSV (site) | 1 | 2 min | `import-csv-check` |
| Import CSV (user) | 10 | 1 h | `import-csv-check` |
| Create demo | 1 | 24 h | `create-demo` |
| Fetch SIRET | 10 | 5 min | `fetch-from-siret` |
| Simulator checkout | 5 | 1 h | `create-simulator-checkout` |
| Add-on checkout | 2/h, 6/jour | — | `create-addon-checkout` |
| Support chatbot | 30 | 1 h | `support-chatbot` |
| AI hypothesis | 20 | 1 h | `ai-hypothesis-suggest` |

- [ ] Vérifier `rate_limits` purgée régulièrement (`cleanup_old_rate_limits()`)

---

## 4. Logs & PII

- [ ] **IP** : jamais en clair → hash SHA256
- [ ] **Email** : masqué (`abc***@domain`)
- [ ] **Password / token / secret** : jamais loggés
- [ ] **AI Proxy** : redaction active (`ai-proxy`)
- [ ] **CSV exports** : sanitization formules (préfixe `'` sur `=`,`+`,`-`,`@`)

```typescript
// ❌ INTERDIT
console.log(`User ${email} from IP ${ip}`);

// ✅ CORRECT
console.log(`User ${email.replace(/(.{2}).*@/, '$1***@')} from ${hashIp(ip)}`);
```

---

## 5. Storage (buckets)

| Bucket | Public | Politique | Quota |
|--------|--------|-----------|-------|
| `avatars` | ✅ Oui | Upload : `auth.uid()`, max **2 MB** | — |
| `exports` | ❌ Non | Lecture via signed URL `get-export-download-url` | 7 j TTL |
| `compliance-reports` | ❌ Non | `get-compliance-report-download-url` | 30 j |
| `audit-archives` | ❌ Non | `get-audit-archive-download-url` | longue |
| `backup-files` | ❌ Non | service role only | 30 j |
| `diagnostics` | ❌ Non | super_admin via `collect-diagnostics` | 30 j |

---

## 6. Edge Functions (91 au total)

### 6.1 Vérifications transverses

- [ ] CORS via `_shared/cors.ts`
- [ ] JWT vérifié (sauf endpoints `verify_jwt = false` listés ci-dessous)
- [ ] Validation de schéma (zod ou équivalent)
- [ ] Erreurs génériques au client
- [ ] Audit log pour opération sensible
- [ ] Pagination > 1000 lignes (`compute-analytics`, `recompute-analytics`, `generate-financial-pdf`, `run-export-job`, `generate-compliance-report`)

### 6.2 Endpoints publics (`verify_jwt = false`)

| Function | Raison |
|----------|--------|
| `create-simulator-checkout` | Guest checkout simulateur |
| `create-simulator-lead` | Capture lead simulateur gratuit |
| `send-simulator-summary` | Email récap post-simulation |
| `send-contact` | Formulaire contact public |
| `csp-report` | Endpoint reporting CSP |
| `validate-postal-code` | Lookup public |
| `fetch-from-siret` | Lookup SIRENE (rate-limité) |
| `stripe-webhook` | Signature Stripe vérifiée à la place du JWT |
| `backup-callback` | Token signé par le provider |

→ **Tous** doivent inclure `corsHeaders` explicites.

---

## 7. Frontend

- [ ] Aucun secret dans le bundle client
- [ ] Validation client + serveur
- [ ] Messages d'erreur non-révélateurs
- [ ] HTTPS strict
- [ ] CSP en mode **enforcement** (meta tag `index.html`)
- [ ] Pas de `<noscript><img>` dans `<head>`

---

## 8. Responsive & accessibilité

- [ ] Login / Signup (320 px → desktop)
- [ ] Import CSV wizard
- [ ] Dashboard (charts uniformes 360 px)
- [ ] Comparaison sites
- [ ] Profil + avatar editor
- [ ] Demo tutorial spotlight

---

## 9. Stripe & billing

- [ ] Webhook signature vérifiée
- [ ] `stripe-reconcile-cron` exécuté < 24 h
- [ ] Aucun PAN/CVC stocké côté DB
- [ ] Mode test ≠ mode live correctement séparé
- [ ] Trial 14 j fonctionnel (`trial-reminder`)

---

## 10. Kill switches & feature flags

- [ ] `platform_feature_flags.imports_enabled` testé ON/OFF
- [ ] `ai_enabled` testé ON/OFF
- [ ] `stripe_checkout_enabled` testé ON/OFF
- [ ] `signup_enabled` testé ON/OFF

---

## 11. Cron jobs (Edge Functions)

| Cron | Fréquence | Alerte sur échec |
|------|-----------|------------------|
| `compute-analytics-cron` | quotidien | `send-cron-alert` |
| `stripe-reconcile-cron` | quotidien | `send-cron-alert` |
| `cleanup-audit-logs` | hebdo | — |
| `cleanup-login-logs` | hebdo | — |
| `cleanup-audit-archives` | mensuel | — |
| `cleanup-compliance-reports` | mensuel | — |
| `dr-drill-reminder` | mensuel | `send-system-alert` |
| `backup-drill-reminder` | mensuel | `send-system-alert` |
| `trial-reminder` | quotidien | — |
| `check-churn-alert` | quotidien | — |
| `monthly-compliance-report` | mensuel | — |
| `smoke-tests-cron` | quotidien | `send-system-alert` |
| `permission-tests-cron` | quotidien | `send-permission-alert` |
| `import-parser-tests-cron` | quotidien | `send-system-alert` |
| `beta-inactivity-check` | hebdo | — |
| `secrets-health` | quotidien | `send-system-alert` |

- [ ] `cron_logs` consulté < 24 h, aucun `status='error'` non traité

---

## 12. Commandes utiles

### Lancer la suite QA

```bash
cp .env.qa.example .env.qa
source .env.qa && npx ts-node scripts/qa/smoke.ts
```

### Auditer les RLS

```sql
SELECT schemaname, tablename, policyname, permissive, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### Linter Supabase

Lancer le linter via l'outil Lovable Cloud — corriger toute alerte WARN ou ERROR avant publish.

### Purger rate limits

```sql
SELECT cleanup_old_rate_limits();
```

---

**Dernière régénération** : 2026-04-27
**Responsable** : Équipe Sécurité Lavcom

---

## Annexe — Prompt de régénération

```
Régénère docs/security-checklist.md pour Lavcom Performances en partant de
zéro, en t'appuyant uniquement sur l'état réel du code/DB. Structure exigée :

0. Backups & DR (config + historique tableau + procédure + modèle texte)
1. Auth & comptes (MFA, OTP, trusted devices, sessions, rate limits)
2. RLS — section 2.1 query d'audit, 2.2 tableau exhaustif des tables
   critiques (lister TOUTES celles trouvées via `psql -c "select tablename
   from pg_tables where schemaname='public'"` — environ 83 tables —
   regroupées : sites, operations, profiles, subs/purchases, site_*, fin_*,
   team_*, audit/system, rate_limits/mfa, paywall, roles), 2.3 tests SQL
   d'isolation multi-tenant
3. Rate limiting — tableau scope/limite/fenêtre/edge function
4. Logs & PII — règles + exemples bons/mauvais
5. Storage buckets — tableau bucket/public/policy/quota
6. Edge Functions (91 total) — checks transverses + liste exhaustive
   `verify_jwt = false`
7. Frontend — secrets, validation, CSP enforcement
8. Responsive — écrans critiques
9. Stripe & billing
10. Kill switches platform_feature_flags
11. Cron jobs — tableau de TOUS les *-cron / *-reminder / cleanup-* trouvés
    dans supabase/functions/ avec fréquence + alerte
12. Commandes utiles (QA, RLS audit, linter, cleanup rate_limits)
13. Annexe — Prompt de régénération (recopier ce bloc)

Règles :
- Cocher [ ] pour les vérifications, ✅/❌ pour les statuts factuels.
- Aucune invention : vérifier chaque table/function/limite dans le code.
- Format markdown propre avec tableaux.
- Date "Dernière régénération" = date du jour.
```
