# Architecture Technique du Projet

## Frontend

| Outil | Version | Rôle |
|---|---|---|
| **React** | 18.3 | Framework UI — composants, état, rendu |
| **Vite** | — | Bundler et serveur de développement ultra-rapide avec HMR |
| **TypeScript** | — | Typage statique sur tout le codebase |
| **Tailwind CSS** + `tailwindcss-animate` | — | Styling utilitaire + animations CSS |
| **shadcn/ui** (Radix UI) | — | ~25 composants accessibles (Dialog, Select, Tabs, Toast, Accordion, etc.) |
| **React Router DOM** | 6.30 | Routage SPA (pages, navigation, paramètres URL) |
| **TanStack React Query** | 5.83 | Cache et fetch des données serveur, mutations, invalidation automatique |
| **React Hook Form** + **Zod** | 7.61 / 3.25 | Gestion de formulaires + validation de schémas côté client |
| **Recharts** | 2.15 | Graphiques interactifs (barres, lignes, camemberts, aires) |
| **Framer Motion** | 12.23 | Animations UI avancées (transitions, gestures, layout animations) |
| **jsPDF** + `jspdf-autotable` | 4.0 / 5.0 | Génération de PDF côté client (rapports, exports) |
| **PapaParse** | 5.5 | Parsing et import de fichiers CSV |
| **Zustand** | 5.0 | État global léger (stores partagés entre composants) |
| **i18next** + `react-i18next` | 25.7 / 16.5 | Internationalisation (français / anglais) |
| **date-fns** | 3.6 | Manipulation et formatage de dates |
| **Sonner** | 1.7 | Notifications toast élégantes |
| **React Helmet Async** | 2.0 | SEO — meta tags dynamiques par page |
| **html2canvas** | 1.4 | Capture d'écran de composants DOM (screenshots) |
| **cmdk** | 1.1 | Command palette (recherche rapide type ⌘K) |
| **Embla Carousel** | 8.6 | Carrousel/slider performant |
| **Vaul** | 0.9 | Drawer mobile (bottom sheet) |
| **input-otp** | 1.4 | Champ OTP (codes de vérification) |
| **react-image-crop** | 11.0 | Recadrage d'images côté client |
| **react-resizable-panels** | 2.1 | Panneaux redimensionnables (layouts ajustables) |
| **next-themes** | 0.3 | Gestion du thème clair/sombre |
| **Vitest** | 4.0 | Tests unitaires et d'intégration |

## Backend (Lovable Cloud / Supabase)

| Composant | Rôle |
|---|---|
| **PostgreSQL** | Base de données relationnelle — ~50+ tables (operations, sites, organizations, analytics, audit_logs, fin_projects, kb_knowledge, etc.) |
| **Row Level Security (RLS)** | Sécurité au niveau des lignes — chaque requête SQL est filtrée automatiquement par `auth.uid()` |
| **Auth** | Système d'authentification complet : inscription email, connexion, sessions, refresh tokens, MFA (multi-factor authentication) |
| **Storage** | Buckets de fichiers pour archives d'audit, exports PDF/CSV, bundles de diagnostics, avatars |
| **Edge Functions (Deno)** | ~60+ fonctions serverless pour la logique métier côté serveur |
| **Realtime** | Subscriptions PostgreSQL en temps réel via WebSocket |

## Edge Functions (liste complète)

### Authentification & Sécurité
- `auth-signup` — Inscription personnalisée
- `log-login` — Journalisation des connexions utilisateur
- `log-admin-login` — Journalisation des connexions admin
- `send-suspicious-login-alert` — Alerte connexion suspecte
- `cleanup-login-logs` — Nettoyage des logs de connexion
- `require-mfa` — Déclenchement MFA
- `verify-mfa-challenge` — Vérification du challenge MFA
- `start-impersonation` / `end-impersonation` / `get-impersonation-session` — Impersonation admin

### Paiement & Stripe
- `create-subscription-checkout` — Checkout abonnement
- `create-simulator-checkout` — Checkout simulateur
- `create-addon-checkout` — Checkout addon
- `customer-portal` — Portail client Stripe
- `stripe-webhook` — Réception des webhooks Stripe
- `stripe-reconcile-cron` — Réconciliation Stripe automatique
- `list-invoices` — Liste des factures

### Analytics & Données
- `compute-analytics` — Calcul des analytics par site
- `compute-analytics-cron` — Cron de calcul automatique
- `recompute-analytics` — Recalcul forcé
- `import-csv-check` — Validation et import CSV

### Exports & PDF
- `generate-financial-pdf` — Génération PDF financier complet (banque)
- `generate-fin-export` — Export financier (PDF/Excel)
- `create-export-job` / `run-export-job` / `get-export-download-url` — Système d'export asynchrone

### Audit & Conformité
- `cleanup-audit-logs` — Nettoyage des logs d'audit
- `get-audit-archive-download-url` — Téléchargement archives audit
- `verify-archive-integrity` — Vérification intégrité archives
- `verify-archives-bulk` — Vérification en masse
- `cleanup-audit-archives` — Nettoyage archives
- `monthly-compliance-report` — Rapport de conformité mensuel
- `generate-compliance-report` — Génération rapport conformité
- `get-compliance-report-download-url` — Téléchargement rapport
- `cleanup-compliance-reports` — Nettoyage rapports
- `verify-compliance-report-integrity` — Vérification intégrité
- `send-audit-report` — Envoi rapport audit par email

### Alertes & Notifications
- `send-system-alert` — Alerte système générique
- `send-cron-alert` — Alerte cron (échecs/retards)
- `send-subscription-email` — Email abonnement
- `send-permission-alert` — Alerte changement permissions
- `send-audit-alert` — Alerte audit
- `check-churn-alert` — Détection risque churn
- `check-webhook-status` — Surveillance webhooks
- `send-orphan-page-alert` — Alerte pages orphelines
- `trial-reminder` — Rappel fin de période d'essai

### Administration
- `send-admin-invitation` — Invitation admin
- `send-team-invitation` — Invitation équipe
- `accept-invitation` — Acceptation invitation
- `validate-invitation` — Validation token invitation
- `create-demo` / `reset-demo` — Gestion des démos
- `create-project` — Création de projet

### DR & Monitoring
- `run-dr-drill` — Exercice de reprise d'activité
- `dr-drill-reminder` — Rappel exercice DR
- `backup-drill-reminder` — Rappel backup
- `smoke-tests-cron` — Tests de fumée automatiques
- `permission-tests-cron` — Tests permissions automatiques
- `import-parser-tests-cron` — Tests parseurs import
- `secrets-health` — Santé des secrets
- `collect-diagnostics` — Collecte diagnostics
- `evaluate-platform-readiness` — Évaluation état plateforme
- `log-performance` — Journalisation performances
- `log-event` — Journalisation événements génériques

### IA & Divers
- `ai-proxy` — Proxy vers modèles IA
- `ai-hypothesis-suggest` — Suggestions IA pour hypothèses financières
- `support-chatbot` — Chatbot support
- `send-contact` — Formulaire de contact
- `submit-expert-request` — Demande d'expert
- `fetch-from-siret` — Recherche entreprise par SIRET
- `validate-postal-code` — Validation code postal
- `csp-report` — Réception rapports CSP (Content Security Policy)

### Beta & Laveries
- `enroll-company-in-beta` — Inscription beta
- `end-beta-early` — Fin anticipée beta
- `log-beta-event` — Événement beta
- `submit-beta-feedback` — Feedback beta
- `close-laundromat` — Fermeture laverie
- `reactivate-laundromat` — Réactivation laverie

## Interactions entre les couches

```
┌─────────────────────────────────────────────────────────┐
│                      FRONTEND                           │
│                                                         │
│  React Query ──► Supabase Client JS ──► REST API        │
│  (cache, retry)   (auth token auto)    (PostgREST)      │
│                                                         │
│  jsPDF ──► PDF côté client (rapports simples)           │
│  PapaParse ──► Parsing CSV avant envoi serveur          │
│  Zustand ──► État global (UI state, préférences)        │
│  i18next ──► Traductions FR/EN                          │
└────────────────────────┬────────────────────────────────┘
                         │
            HTTPS / WebSocket (auth JWT auto)
                         │
┌────────────────────────▼────────────────────────────────┐
│                   BACKEND (Cloud)                        │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ PostgreSQL   │  │ Edge Funcs   │  │ Auth          │  │
│  │ + RLS        │◄─┤ (Deno)       │  │ (JWT, MFA)    │  │
│  │ (~50 tables) │  │ (~60 funcs)  │  │               │  │
│  └──────┬───────┘  └──────┬───────┘  └───────────────┘  │
│         │                 │                              │
│         │          ┌──────▼───────┐                      │
│         │          │ APIs externes│                      │
│         │          │ - Stripe     │                      │
│         │          │ - Resend     │                      │
│         │          │ - OpenAI/AI  │                      │
│         │          └──────────────┘                      │
│  ┌──────▼───────┐                                       │
│  │ Storage      │                                       │
│  │ (fichiers)   │                                       │
│  └──────────────┘                                       │
└─────────────────────────────────────────────────────────┘
```

## Flux de données typiques

### 1. Lecture de données (ex: liste des sites)
```
React Component → useQuery("sites") → supabase.from("sites").select() → PostgreSQL (filtré par RLS) → JSON → React Query cache → Rendu
```

### 2. Génération PDF banque (serveur)
```
Bouton Export → supabase.functions.invoke("generate-financial-pdf") → Edge Function lit les données DB → jsPDF serveur → PDF binaire → Téléchargement navigateur
```

### 3. Import CSV
```
Fichier CSV → PapaParse (parsing client) → supabase.functions.invoke("import-csv-check") → Validation + insertion DB → Invalidation React Query → Mise à jour UI
```

### 4. Paiement Stripe
```
Bouton Payer → supabase.functions.invoke("create-subscription-checkout") → Stripe Checkout Session → Redirect Stripe → Webhook stripe-webhook → Mise à jour DB → Realtime → UI mise à jour
```

### 5. Cron automatique (analytics)
```
Scheduler → compute-analytics-cron → compute-analytics (par site) → INSERT analytics_daily/analytics_kpis → send-cron-alert si erreur
```

## Tables principales (groupées)

### Métier
`operations`, `sites`, `organizations`, `import_batches`, `company_payment_config`

### Analytics
`analytics_daily`, `analytics_kpis`

### Finance (simulateur)
`fin_projects`, `fin_workspaces`, `fin_hypotheses`, `fin_hypothesis_snapshots`, `fin_line_items`, `fin_forecasts`, `fin_scenarios`, `fin_exports`

### Knowledge Base
`kb_knowledge`, `kb_knowledge_versions`, `kb_faq`, `kb_rules`, `kb_sources`

### Audit & Conformité
`audit_logs`, `audit_log_archives`, `compliance_reports`, `permission_audit_logs`, `privacy_consent_audit_logs`

### Auth & Sécurité
`login_logs`, `auth_login_events`, `auth_login_otps`, `mfa_challenges`, `admin_login_history`, `admin_trusted_ips`, `admin_blocked_users`, `admin_audit_logs`

### Notifications & Alertes
`notification_preferences`, `alert_history`, `cron_alert_settings`, `churn_alert_settings`

### Administration
`platform_roles`, `platform_feature_flags`, `orphan_page_reviews`, `permission_webhooks`, `impersonation_sessions`

### DR & Monitoring
`dr_drill_history`, `dr_drill_runs`, `cron_logs`, `diagnostics_bundles`

### Beta
`beta_feedback`, `beta_company_overrides`

### Divers
`contact_messages`, `expert_requests`, `file_metadata`, `export_jobs`, `fr_geo_regions`, `ai_usage_daily`
