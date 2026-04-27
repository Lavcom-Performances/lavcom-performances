# Architecture Technique du Projet — Lavcom Performances

## Frontend

- **Framework**: React 18 + Vite 5 + TypeScript 5.
- **Routing**: `react-router-dom` v6, `BrowserRouter` (incompatible avec `useBlocker` — utiliser `useUnsavedChangesWarning`).
- **State**:
  - **Server state**: TanStack Query (`@tanstack/react-query`) — cache 2 min côté client pour KPIs dashboard.
  - **Client state**: Zustand (stores localisés) + React Context (`ImpersonationContext`, `ViewModeProvider`, `DateRangeProvider`).
  - **Persistance**: `localStorage` pour `activeLaundromatId`, `lavcom_app_context`, préférences UI.
- **UI**: shadcn/ui (Radix primitives), Tailwind CSS v3 avec tokens sémantiques HSL dans `src/index.css`, framer-motion, recharts, lucide-react.
- **i18n**: `react-i18next` — 6 langues (FR / EN / ES / IT / DE / NL) dans `src/locales/`. Terminologie FR métier standardisée.
- **Formulaires**: `react-hook-form` + `zod` pour validation côté client.
- **Build**: Vite avec splitting automatique. Bundle principal + lazy chunks pour pages lourdes.
- **Hosting**: Lovable hosting avec SPA fallback intégré (pas de `_redirects` ou `vercel.json` requis).
- **Analytics tracking**: GTM (`GTM-TQP6TGS3`) + fallback `<noscript>` dans `<body>` (jamais dans `<head>`).
- **CSP**: Mode enforcement via balise `<meta>` dans `index.html`. Domaines Stripe critiques autorisés (`frame-src`, `script-src`, `img-src`).

## Backend (Lovable Cloud / Supabase)

- **Database**: PostgreSQL managée par Supabase. RLS activé sur **toutes** les tables `public.*`.
- **Helpers SECURITY DEFINER** (search_path verrouillé): `owns_site()`, `owns_operation_site()`, `has_platform_role()`, `is_super_admin()`, `rpc_has_paywall_bypass()`, `rpc_operations_period_kpis()`.
- **Auth**: Supabase Auth — email/password, Google OAuth, MFA TOTP, recovery codes, trusted devices.
- **Storage**: buckets pour avatars (max 2 Mo), exports CSV/PDF, audit archives, backups, compliance reports. Policies miroir des RLS DB.
- **Realtime**: subscriptions sur `audit_logs` (monitoring activité), `operations` (refresh dashboard).
- **Vault**: secrets serveur (Stripe, Resend, Lovable AI Gateway, ScreenshotOne, service role).
- **pg_cron**: jobs récurrents (analytics, cleanup, reconcile, DR drills).

## Edge Functions (liste complète)

~95 fonctions Deno. Chacune dans `supabase/functions/<nom>/index.ts`. CORS obligatoire pour les fonctions invoquées par le frontend (et invités).

### Authentification & Sécurité
- `auth-signup` — création de compte avec validation
- `log-login`, `log-login-event` — log connexions
- `send-login-otp`, `verify-login-otp` — OTP par email
- `generate-recovery-codes`, `verify-recovery-code` — codes de secours MFA
- `require-mfa`, `verify-mfa-challenge` — challenges MFA
- `remove-trusted-device`, `revoke-other-sessions`
- `send-suspicious-login-alert` — alertes connexion suspecte (changement pays / device 90j)
- `log-admin-login` — historique admin

### Paiement & Stripe
- `create-subscription-checkout` — abonnement SaaS
- `create-simulator-checkout` — packs simulateur (guest-friendly, CORS requis)
- `create-addon-checkout` — extension 30j / +1 projet
- `customer-portal` — Stripe Customer Portal
- `stripe-webhook` — réception événements Stripe (subscriptions, invoices)
- `stripe-reconcile-cron` — réconciliation nightly (ignore les ID manquants)
- `list-invoices` — historique facturation
- `send-subscription-email` — confirmations
- `trial-reminder` — relance fin d'essai 14j

### Analytics & Données
- `compute-analytics` — calcul incrémental `analytics_daily` / `analytics_kpis`
- `compute-analytics-cron` — déclencheur planifié
- `recompute-analytics` — recalcul complet (utilise pagination >1000 rows)
- `import-csv-check` — pré-validation CSV
- `import-parser-tests-cron` — tests automatiques des adapters

### Exports & PDF
- `create-export-job`, `run-export-job`, `get-export-download-url`
- `generate-financial-pdf` — PDF business plan (calculs serveur, headers `#2F75B5`, TTC→HT)
- `generate-fin-export` — export multi-format projections
- `generate-compliance-report`, `monthly-compliance-report`
- `get-compliance-report-download-url`, `verify-compliance-report-integrity`

### Audit & Conformité
- `cleanup-audit-logs`, `cleanup-audit-archives`, `cleanup-compliance-reports`, `cleanup-login-logs`
- `get-audit-archive-download-url`
- `verify-archive-integrity`, `verify-archives-bulk`
- `send-audit-alert`, `send-audit-report`

### Alertes & Notifications
- `send-contact` — formulaire contact
- `send-system-alert`, `send-cron-alert`
- `send-orphan-page-alert`, `send-permission-alert`
- `send-team-invitation`, `send-admin-invitation`
- `send-simulator-summary` — récap simulateur gratuit (Resend)

### Administration
- `start-impersonation`, `end-impersonation`, `get-impersonation-session` (max 30 min, 10/jour, bloque routes `/admin`)
- `evaluate-platform-readiness`
- `secrets-health` — vérifie présence secrets Vault
- `check-webhook-status`
- `csp-report` — ingestion violations CSP

### DR & Monitoring
- `backup-system`, `backup-callback`, `backup-drill-reminder`
- `run-dr-drill`, `dr-drill-reminder` (ScreenshotOne API + SHA256)
- `collect-diagnostics`
- `log-event`, `log-performance`

### IA & Divers
- `ai-proxy` — proxy générique Lovable AI Gateway
- `ai-hypothesis-suggest` — suggestions IA pour projections financières (Gemini 2.5 Pro)
- `support-chatbot` — chatbot d'aide (Gemini 2.0 Flash, multilingue)
- `fetch-from-siret` — enrichissement société via SIRET
- `validate-postal-code` — validation code postal FR
- `validate-invitation`, `accept-invitation`

### Beta & Laveries
- `enroll-company-in-beta`, `end-beta-early`, `beta-inactivity-check`
- `log-beta-event`, `submit-beta-feedback`, `submit-expert-request`
- `check-churn-alert`
- `close-laundromat`, `reactivate-laundromat` (soft-delete uniquement)
- `create-demo`, `reset-demo` (entités `demo_mode=true`, expiration 30 min, prix fixes 3,50 € / 4,50 €)
- `create-project`, `create-simulator-lead`
- `smoke-tests-cron`, `permission-tests-cron`

## Interactions entre les couches

```
┌────────────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)                     │
│  Pages → Hooks (useAuth, useCurrentSite, useAnalytics, etc.)   │
└──────────────┬──────────────────────────────────────────┬──────┘
               │ supabase-js                              │ supabase.functions.invoke()
               ▼                                          ▼
┌──────────────────────────┐        ┌────────────────────────────┐
│    PostgREST + RLS       │        │   Edge Functions (Deno)    │
│  SELECT/INSERT direct    │        │  Logique serveur, secrets, │
│  via owns_site() guards  │        │  Stripe, Resend, AI, PDF   │
└──────────┬───────────────┘        └─────────┬──────────────────┘
           │                                  │
           ▼                                  ▼
┌────────────────────────────────────────────────────────────────┐
│              PostgreSQL (Supabase) + Vault                     │
│  Tables public.* + pg_cron + Realtime + Storage                │
└────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
                    ┌──────────────────────────┐
                    │ Stripe / Resend / Gemini │
                    │ ScreenshotOne / api-adresse │
                    └──────────────────────────┘
```

## Flux de données typiques

### 1. Lecture de données (ex: liste des sites)
```
useSites() (React hook)
  └─► supabase.from('sites').select(...)
      └─► PostgREST applique RLS (owns_site / organization_id)
          └─► Renvoie uniquement les sites de l'utilisateur
              └─► TanStack Query cache 2 min, UI se met à jour
```

### 2. Génération PDF banque (serveur)
```
PrevisionnelPage → bouton Export
  └─► supabase.functions.invoke('generate-financial-pdf', { projectId })
      └─► Edge fn vérifie JWT + ownership
      └─► Recalcule TOUS les chiffres serveur (jamais le PDF côté client)
      └─► Convertit TTC→HT, applique theme #2F75B5
      └─► Upload vers Storage bucket `fin_exports`
      └─► Insert ligne dans `fin_exports`
      └─► Renvoie URL signée → téléchargement navigateur
```

### 3. Import CSV
```
ImportExport.tsx
  └─► useMultiFormatImport (parseUnified.ts)
      └─► Adapter (wiline / lmcontrol) → rows canoniques
          └─► Dedup via buildDedupeKey
              └─► Insert batch dans `import_batches` + `operations`
                  └─► useAnalyticsRefresh.invalidate()
                      └─► invoke('compute-analytics')
                          └─► Met à jour `analytics_daily` / `analytics_kpis`
                              └─► Realtime push → Dashboard re-render
```
Garde-fous: max 10 Mo, 200k lignes, 10 fichiers/batch, rate limit 2/h et 6/j.

### 4. Paiement Stripe
```
/pricing → CTA
  └─► invoke('create-subscription-checkout', { priceId })
      └─► Edge fn crée Stripe Checkout Session
          └─► Redirection vers Stripe → paiement
              ├─► Stripe envoie webhook ───► invoke('stripe-webhook')
              │                                  ├─► Upsert `subscriptions`
              │                                  ├─► Insert `stripe_events`
              │                                  └─► Trigger `send-subscription-email`
              └─► Redirection → /billing/success
                  └─► useSubscription rafraîchit l'état
```

### 5. Cron automatique (analytics)
```
pg_cron (toutes les nuits)
  └─► HTTP call → compute-analytics-cron
      └─► Boucle pages 1000 sites (pagination obligatoire)
          └─► Pour chaque site: invoke('compute-analytics')
              ├─► Si succès: insert `cron_logs` (severity=info)
              └─► Si erreur: invoke('send-cron-alert') + insert `system_events` (severity=warn)
```

## Tables principales (groupées)

### Métier
- `organizations`, `sites`, `site_access`, `team_invitations`
- `operations`, `import_batches`
- `site_costs`, `kpi_objectives`, `user_goals`
- `projects`, `purchases`

### Analytics
- `analytics_daily`, `analytics_kpis`, `site_analytics_state`
- `v_data_quality_operations` (vue)
- `user_chart_preferences`

### Finance (simulateur + projections)
- `simulator_leads` — captures du simulateur gratuit `/simulateur`
- `fin_workspaces`, `fin_projects`, `fin_scenarios`
- `fin_hypotheses`, `fin_hypothesis_snapshots`
- `fin_line_items`, `fin_forecasts`, `fin_exports`

### Knowledge Base
- `kb_sources`, `kb_knowledge`, `kb_knowledge_versions`
- `kb_faq`, `kb_rules`

### Audit & Conformité
- `audit_logs`, `audit_log_archives`
- `permission_audit_logs`, `permission_webhooks`
- `compliance_reports`
- `privacy_consent_audit_logs`, `organization_privacy_settings`
- `system_events`

### Auth & Sécurité
- `profiles`, `user_roles`, `user_permissions`
- `mfa_challenges`, `recovery_codes`, `trusted_devices`
- `auth_login_events`, `auth_login_otps`, `login_logs`
- `admin_audit_logs`, `admin_login_history`, `admin_blocked_users`, `admin_trusted_ips`
- `impersonation_sessions`

### Notifications & Alertes
- `notification_preferences`, `alert_history`
- `churn_alert_settings`, `cron_alert_settings`
- `contact_messages`

### Administration
- `platform_roles`, `platform_feature_flags` (kill-switches)
- `paywall_bypass_allowlist`, `rate_limits`
- `orphan_page_reviews`, `file_metadata`

### DR & Monitoring
- `backup_jobs`, `backup_files`
- `dr_drill_runs`, `dr_drill_history`
- `cron_logs`, `diagnostics_bundles`

### Beta
- `beta_company_overrides`, `beta_feedback`
- `ux_feedback`, `expert_requests`

### Divers
- `stripe_events`, `stripe_invoices`, `subscriptions`, `company_payment_config`
- `ai_usage_daily`
- `trust_day`, `trust_import`, `trust_line` (Data Trust Score)
- `fr_geo_regions`
