# Security Policy — Lavcom Performances

> Politique de sécurité, surface d'attaque, et procédure de divulgation responsable.
> Dernière mise à jour automatique : régénérée à partir du code source actuel.

## 1. Versions supportées

| Version | Statut |
|---------|--------|
| `main` (production) | ✅ Supportée |
| Anciennes branches | ❌ Non supportées |

Le projet est livré en continu (continuous deployment) via Lovable Cloud — il n'y a pas de versions historiques maintenues.

## 2. Signaler une vulnérabilité

1. **NE PAS** ouvrir d'issue publique GitHub.
2. Envoyer un email chiffré (PGP optionnel) à : **security@lavcom.fr**
3. Inclure :
   - Étapes de reproduction détaillées
   - Impact estimé (lecture / écriture / élévation de privilèges)
   - Compte/URL/payload concernés
4. SLA de réponse initiale : **48 h ouvrées**.
5. Délai de correctif cible :
   - Critique (RCE, auth bypass, fuite multi-tenant) : **72 h**
   - Élevé : **7 jours**
   - Moyen : **30 jours**

## 3. Authentification & autorisation

### 3.1 Auth
- **Email confirmation requise** en production (auto-confirm uniquement en dev).
- **MFA TOTP** disponible (`mfa_challenges`, `verify-mfa-challenge`).
- **Codes de récupération** (`recovery_codes`, `generate-recovery-codes`, `verify-recovery-code`).
- **OTP email** (`auth_login_otps`, `send-login-otp`, `verify-login-otp`) déclenché sur changement de pays / device inconnu (≥90 j).
- **Trusted devices** (`trusted_devices`, `remove-trusted-device`).
- **Sessions** : `revoke-other-sessions`.
- **Leaked password protection** : activée côté Supabase Auth.
- **Force minimale du mot de passe** : 8 caractères + indicateur visuel.

### 3.2 RBAC
- Rôles **plateforme** stockés dans `public.platform_roles` (jamais sur `profiles`).
- Rôles **applicatifs** dans `public.user_roles` (enum `app_role`).
- Vérification via fonctions security definer :
  - `public.has_role(_user_id uuid, _role app_role) → boolean`
  - `public.is_platform_admin(_user_id uuid) → boolean`
  - `public.is_super_admin(_user_id uuid) → boolean`
- `ProtectedRoute.tsx` vérifie `isPlatformSuperAdmin` **avant** la lecture du statut billing pour éviter le flicker.
- Bypass paywall via table allowlist `paywall_bypass_allowlist` + `rpc_has_paywall_bypass`.

### 3.3 Impersonation admin
- Sessions strictement bornées : **30 minutes max, 10/jour**.
- Routes `/admin*` **bloquées** pendant l'impersonation (`get-impersonation-session`, `start-impersonation`, `end-impersonation`).
- Toute session écrit dans `impersonation_sessions` + `admin_audit_logs`.

## 4. Isolation multi-tenant

| Périmètre | Mécanisme |
|-----------|-----------|
| Site (laverie) | `owns_site(site_id)` security definer + `auth.uid() = user_id` |
| Operations | `owns_operation_site(operations.site_id)` |
| Organization | Membre via `organizations.owner_id` ou `team_invitations` |
| Soft-delete | `sites.deleted_at IS NULL` enforced everywhere — **jamais de DELETE physique** |

Toutes les jointures vers `auth.users` passent par `profiles` côté application (jamais de `select … from auth.users`).

## 5. Audit & logs

| Table | Contenu | TTL |
|-------|---------|-----|
| `audit_logs` | CRUD sensible (RLS write) | Archivé via `cleanup-audit-logs` → `audit_log_archives` |
| `admin_audit_logs` | Actions super-admin | Conservation longue |
| `system_events` | Erreurs / warnings techniques (`code`, `message`, `meta`) | 90 j |
| `login_logs` / `auth_login_events` | Connexions + risque | `cleanup-login-logs` |
| `permission_audit_logs` | Modifications RBAC | Conservation longue |

Intégrité des archives : `verify-archive-integrity`, `verify-archives-bulk` (SHA256).

## 6. Données sensibles & privacy

- **PII** : emails masqués dans les logs (`abc***@…`), IP **hachées** (jamais en clair).
- **Cartes / IBAN** : jamais stockés — délégué à Stripe.
- **GDPR** : consentement (`privacy_consent_audit_logs`), export utilisateur, soft-delete.
- **Secret redaction** dans `ai-proxy` pour empêcher la fuite de credentials via prompt.
- **Sanitization CSV/Excel** : préfixe `'` sur cellules commençant par `=`, `+`, `-`, `@` (anti-injection formules).

## 7. Sécurité API & Edge Functions

Tout edge function suit ces patterns :

1. **Vérification JWT** (sauf endpoints guests explicitement marqués `verify_jwt = false` avec `corsHeaders`).
2. **Rate limiting** par user/IP via `rate_limits`.
3. **Validation de schéma** stricte des inputs.
4. **CORS** explicite (helper `_shared/cors.ts`).
5. **Audit logging** pour les opérations sensibles.
6. **Pagination** obligatoire pour traitements > 1000 lignes (`compute-analytics`, `recompute-analytics`, `generate-financial-pdf`).
7. **Erreurs génériques** côté client (pas de leak d'info interne).

### Rate limits (extrait `rate_limits`)

| Action | Limite | Fenêtre |
|--------|--------|---------|
| Login | 5 | 15 min |
| Signup | 3 | 1 h |
| Import CSV (par site) | 1 | 2 min |
| Import CSV (par user) | 10 | 1 h |
| Create demo | 1 | 24 h |
| Fetch SIRET | 10 | 5 min |
| Simulator add-on checkout | 2/h, 6/jour |  — |

## 8. Kill switches (Safe Mode)

`platform_feature_flags` permet à un super-admin de désactiver instantanément, **sans redéploiement** :
- `imports_enabled`
- `ai_enabled`
- `stripe_checkout_enabled`
- `signup_enabled`

## 9. Disaster recovery

- Cadre TAEX-219/220 : `docs/ops/dr-drill.md`.
- Edge function `run-dr-drill` + rappel `dr-drill-reminder`.
- Capture preuve via ScreenshotOne + hash SHA256 stocké dans `dr_drill_runs` / `dr_drill_history`.
- Backups quotidiens Lovable Cloud, rétention ≥ 30 j, point-in-time recovery.

## 10. CI/CD & supply chain

- **Dependabot** : alertes + PR automatiques.
- **CodeQL** : analyse statique.
- **TruffleHog** : scan de secrets sur les commits.
- **npm audit** + **Snyk** (optionnel via `SNYK_TOKEN`).
- **Branch protection** sur `main` : PR review obligatoire + status checks verts.

## 11. CSP & frontend

- CSP en mode **enforcement** via meta tag `index.html`.
- Domaines autorisés : Stripe (`frame-src`, `script-src`, `img-src`), Lovable AI Gateway, Supabase, Resend, GTM (`GTM-TQP6TGS3`).
- Pas de `<noscript><img>` dans `<head>` (HTML5 strict) — fallback pixels dans `<body>`.
- Pas de secrets dans le bundle client : seules les clés `anon` / `publishable` sont exposées.

## 12. Stripe & paiements

- Tous webhooks vérifiés via signature `stripe-webhook`.
- Réconciliation périodique : `stripe-reconcile-cron` (ignore les IDs disparus).
- Guest checkout (simulateur) : `create-simulator-checkout` avec `corsHeaders` explicites.

## 13. Surface RLS résumée

| Table critique | Accès user | Accès admin |
|----------------|------------|-------------|
| `profiles` | Sa propre ligne | Read all (super_admin) |
| `sites` | `auth.uid() = user_id` + `deleted_at IS NULL` | Read all |
| `operations` | `owns_site(site_id)` | Read all |
| `import_batches` | `owns_site(site_id)` | Read all |
| `subscriptions` | `auth.uid() = user_id` | Read all |
| `audit_logs` | Aucune lecture | Read all |
| `system_events` | Aucune | Read all |
| `platform_roles` | Lecture propre rôle | Tous (super_admin) |
| `rate_limits` | Service role only | Service role only |

## 14. Conformité

- **GDPR** : ready (consentement, export, droit à l'oubli via soft-delete + scrubbing).
- **Audit trail** complet pour toute opération sensible.
- **Anonymisation IP** dans les logs.

## 15. Checklist annuelle

- [ ] Rotation `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Rotation `STRIPE_SECRET_KEY`
- [ ] Rotation `LOVABLE_API_KEY`
- [ ] Revue des `platform_roles` (révoquer les inactifs)
- [ ] DR drill documenté dans `dr_drill_runs`
- [ ] Restore test backup documenté dans `security-checklist.md` §0
- [ ] Pen test externe (recommandé annuellement)

---

## Annexe — Prompt de régénération

> Utiliser ce prompt pour faire régénérer ce fichier à l'identique en partant de zéro, en s'appuyant sur l'état réel du code.

```
Régénère le fichier docs/SECURITY.md pour ce projet Lavcom Performances en suivant
strictement la structure suivante (15 sections + annexe), en t'appuyant uniquement
sur le code source actuel (jamais d'invention) :

1. Titre + dernière mise à jour
2. Versions supportées
3. Procédure de signalement de vulnérabilité (PGP, SLA, délais correctifs)
4. Authentification & autorisation : auth (MFA, OTP, recovery codes, trusted
   devices, sessions, leaked password, password strength), RBAC (lister les
   tables platform_roles / user_roles, et les fonctions security definer
   has_role / is_platform_admin / is_super_admin trouvées dans la DB),
   ProtectedRoute order, paywall bypass
5. Impersonation admin (limites 30min/10 par jour, edge functions
   start-/end-/get-impersonation-session, tables impersonation_sessions +
   admin_audit_logs)
6. Isolation multi-tenant : owns_site, owns_operation_site, soft-delete sites
7. Audit & logs : tabler tableau toutes les tables _logs/_events trouvées dans
   la DB avec leur TTL et la fonction de cleanup associée
8. Données sensibles & privacy : PII masking, IP hashing, sanitization CSV
   (préfixe ' pour =,+,-,@), secret redaction ai-proxy
9. Sécurité Edge Functions : 7 patterns obligatoires + tableau rate_limits
10. Kill switches platform_feature_flags
11. Disaster recovery (run-dr-drill, ScreenshotOne, SHA256, dr_drill_runs)
12. CI/CD & supply chain (Dependabot, CodeQL, TruffleHog, npm audit, Snyk)
13. CSP & frontend (enforcement via meta, domains, anon/publishable only)
14. Stripe (webhook signature, stripe-reconcile-cron, guest checkout corsHeaders)
15. Tableau RLS résumé (profiles, sites, operations, import_batches,
    subscriptions, audit_logs, system_events, platform_roles, rate_limits)
16. Conformité GDPR
17. Checklist annuelle (rotation clés service role, Stripe, Lovable AI ;
    revue platform_roles ; DR drill ; restore test ; pen test)
18. Annexe — Prompt de régénération (recopier ce bloc)

Règles :
- Aucune mention "Supabase" côté communication user — utiliser "Lovable Cloud" /
  "backend" / "authentification". En revanche les noms techniques de tables et
  edge functions DOIVENT être exacts (vérifier via `psql` et
  `ls supabase/functions/`).
- Toutes les valeurs (limites, durées, comptes) doivent être vérifiées dans le
  code, pas inventées.
- Format Markdown avec tableaux, sections numérotées, emojis statut autorisés.
- Pas de "TODO", pas de placeholders.
```
