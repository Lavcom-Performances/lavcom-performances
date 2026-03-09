# Lavcom Performances — Application Description

> **Version**: March 2026  
> **Domain**: SaaS for self-service laundromat operators (laveries automatiques)  
> **Production URL**: `app.lavcom.fr` (SaaS) / `lavcom.fr` (Marketing site — WordPress)

---

## 1. Business Model

### Value Proposition
Lavcom Performances is a **B2B SaaS platform** that helps self-service laundromat owners and operators **analyze, optimize, and forecast** the financial performance of their laundromats. It transforms raw transaction data (imported from payment terminals via CSV) into actionable business intelligence.

### Revenue Streams

| Stream | Description |
|---|---|
| **Subscription Plans** | Monthly/annual SaaS subscription (trial → paid via Stripe). Plans include `trial`, `standard`, and potentially premium tiers. |
| **Simulator Add-on** | Paid financial simulation tool for prospective laundromat investors (one-time purchase via Stripe checkout). |
| **Financial Projections** | Advanced forecasting tool for business plans (workspace-based access with project limits). |

### Target Users

| Persona | Description |
|---|---|
| **Laundromat Owner** | Primary user — imports data, views dashboards, manages sites |
| **Multi-site Operator** | Manages multiple laundromats from a single account (organization-level) |
| **Prospective Investor** | Uses the free simulator or paid projections tool to evaluate a laundromat project |
| **Platform Admin (Lavcom team)** | Internal team managing users, billing, beta programs, compliance, and knowledge base |

### Monetization Flow
```
Free Landing/Demo → Signup → Trial (N days) → Stripe Checkout → Active Subscription
                  ↘ Simulator (free) → Paid Simulator Add-on
                  ↘ Projections Tool (requires subscription + workspace)
```

---

## 2. Architecture Overview

### Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 + Vite + TypeScript |
| **Styling** | Tailwind CSS + shadcn/ui (Radix primitives) |
| **State Management** | Zustand (global stores) + TanStack React Query (server state) |
| **Forms** | React Hook Form + Zod validation |
| **Charts** | Recharts |
| **Animations** | Framer Motion |
| **i18n** | i18next (FR/EN) |
| **Routing** | React Router DOM v6 |
| **PDF Generation** | jsPDF + jspdf-autotable |
| **CSV Parsing** | PapaParse |
| **Backend** | Lovable Cloud (Supabase) — PostgreSQL + Auth + Storage + Edge Functions |
| **Payments** | Stripe (subscriptions, one-time, webhooks, customer portal) |
| **Email** | Triggered via Edge Functions (Resend/SMTP) |
| **CI/CD** | GitHub Actions (lint, typecheck, Vitest tests, build) |
| **Testing** | Vitest |
| **Hosting** | Lovable Cloud |

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React SPA)                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────────┐  │
│  │  Public   │ │ App      │ │ Simulation│ │ Platform Admin    │  │
│  │  Pages    │ │ (authed) │ │ (standalone)│ │ (super-admin)   │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────────────┘  │
└─────────────────────────┬───────────────────────────────────────┘
                          │ Supabase JS Client
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    LOVABLE CLOUD (Supabase)                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ Auth     │ │ PostgreSQL│ │ Storage  │ │ Realtime │          │
│  │ (JWT)    │ │ + RLS    │ │ (buckets)│ │ (WS)     │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│  ┌──────────────────────────────────────────────────┐          │
│  │           60+ Edge Functions (Deno)              │          │
│  │  Auth · Stripe · Analytics · Exports · Alerts    │          │
│  │  Compliance · AI Proxy · Knowledge Base · Cron   │          │
│  └──────────────────────────────────────────────────┘          │
└─────────────────────────┬───────────────────────────────────────┘
                          │
              ┌───────────┼───────────┐
              ▼           ▼           ▼
         ┌────────┐ ┌─────────┐ ┌──────────┐
         │ Stripe │ │ Resend  │ │ AI Models│
         │  API   │ │ (email) │ │ (Lovable)│
         └────────┘ └─────────┘ └──────────┘
```

---

## 3. Domain Isolation Strategy

| Environment | Domain | Stack | Purpose |
|---|---|---|---|
| **Marketing Site** | `lavcom.fr` | WordPress | SEO content, pricing page, free simulator landing |
| **SaaS Application** | `app.lavcom.fr` | React (this codebase) | Authenticated operator platform |

**Critical rule**: No shared authentication between WP and SaaS. CTAs on the WordPress site redirect to `app.lavcom.fr/signup` or `app.lavcom.fr/login`.

---

## 4. Database Schema

### Core Tables (~50+)

#### User & Organization

| Table | Purpose |
|---|---|
| `organizations` | Companies/groups of laundromat operators. Has `owner_id`, beta status, pricing config |
| `sites` | Individual laundromat locations. Linked to `user_id`. Has `name`, `address`, `city`, `status` (active/closed), `is_demo` |
| `company_payment_config` | Per-site payment terminal configuration (card support, cash denominations, payment stack) |
| `notification_preferences` | Per-user alert preferences (email, push, trial reminders, weekly reports) |

#### Operations & Analytics

| Table | Purpose |
|---|---|
| `operations` | **Core data table** — individual transactions (amount, date, machine, payment mode, category). Linked to `site_id` and `user_id` |
| `import_batches` | Metadata for CSV imports (filename, row counts, site_id) |
| `analytics_daily` | Pre-computed daily analytics per site (revenue, transactions, hourly breakdown, machine stats) |
| `analytics_kpis` | Aggregated KPI summaries per period (weekly/monthly/quarterly) |
| `kpi_objectives` | Monthly revenue/performance targets per site or company |

#### Financial Projections (fin_*)

| Table | Purpose |
|---|---|
| `fin_workspaces` | User workspace with plan limits (max projects, max scenarios) |
| `fin_projects` | Business plan projects with VAT config, project type, questionnaire data |
| `fin_hypotheses` | Key assumptions (costs, revenue drivers) with versioning |
| `fin_hypothesis_snapshots` | Point-in-time snapshots of all hypotheses |
| `fin_line_items` | Revenue/cost line items (machines, services) with utilization rates |
| `fin_scenarios` | Scenario variants (baseline, optimistic, pessimistic) |
| `fin_forecasts` | Monthly forecast outputs (revenue, costs, EBITDA, cashflow) |
| `fin_exports` | Export job tracking for financial PDF/Excel generation |

#### Audit, Compliance & Security

| Table | Purpose |
|---|---|
| `audit_logs` | All critical user actions (CRUD on data, settings changes) |
| `audit_log_archives` | Archived audit logs in storage with SHA256 checksums |
| `compliance_reports` | Generated compliance reports with integrity scores |
| `admin_audit_logs` | Platform admin actions |
| `admin_login_history` | Admin login events with device/location info |
| `admin_blocked_users` | Blocked user records |
| `admin_trusted_ips` | IP allowlist for admin access |
| `login_logs` | User login events (device, browser, IP hash) |
| `auth_login_events` | Detailed auth events with risk assessment |
| `auth_login_otps` | OTP codes for device verification |
| `mfa_challenges` | MFA challenge records |
| `permission_audit_logs` | Permission change audit trail |
| `impersonation_sessions` | Admin impersonation sessions with expiry |

#### Knowledge Base (kb_*)

| Table | Purpose |
|---|---|
| `kb_knowledge` | Knowledge articles (business rules, best practices) with pillars and reliability labels |
| `kb_knowledge_versions` | Version history for knowledge articles |
| `kb_sources` | Reference sources for knowledge (expert, regulation, data) |
| `kb_faq` | FAQ entries derived from knowledge base |
| `kb_rules` | Automated rules engine (conditions → actions) for recommendations |

#### Beta Program

| Table | Purpose |
|---|---|
| `beta_feedback` | User feedback during beta (sentiment, topic, message) |
| `beta_company_overrides` | Per-company beta overrides (suppress recommendations) |

#### Platform Operations

| Table | Purpose |
|---|---|
| `cron_logs` | Scheduled job execution logs |
| `cron_alert_settings` | Alert thresholds for cron job monitoring |
| `alert_history` | Sent alert records |
| `backup_jobs` / `backup_files` | Backup system tracking |
| `diagnostics_bundles` | Debug bundles for support |
| `dr_drill_history` / `dr_drill_runs` | Disaster recovery drill records |
| `export_jobs` | Async export job queue |
| `file_metadata` | User file metadata (documents, uploads) |
| `contact_messages` | Contact form submissions with spam detection |
| `expert_requests` | Expert consultation requests |
| `orphan_page_reviews` | Dead page detection and review |
| `paywall_bypass_allowlist` | Email allowlist for paywall bypass |
| `churn_alert_settings` | Churn detection configuration |
| `ai_usage_daily` | AI feature usage tracking per user |
| `fr_geo_regions` | French geographic reference data (departments/regions) |
| `organization_privacy_settings` | Per-org privacy consent (anonymous benchmarks) |

### Key Relationships

```
auth.users (Supabase managed)
    │
    ├──► organizations (owner_id)
    │       ├──► kpi_objectives (company_id)
    │       ├──► beta_feedback (company_id)
    │       ├──► beta_company_overrides (company_id)
    │       └──► organization_privacy_settings (organization_id)
    │
    ├──► sites (user_id)
    │       ├──► operations (site_id) ◄── import_batches (site_id)
    │       ├──► analytics_daily (site_id)
    │       ├──► analytics_kpis (site_id)
    │       ├──► company_payment_config (company_id → site_id)
    │       ├──► export_jobs (site_id)
    │       ├──► diagnostics_bundles (site_id)
    │       └──► kpi_objectives (site_id)
    │
    ├──► fin_workspaces (owner_user_id)
    │       └──► fin_projects (workspace_id)
    │               ├──► fin_hypotheses (project_id)
    │               ├──► fin_hypothesis_snapshots (project_id)
    │               ├──► fin_line_items (project_id) ──► fin_scenarios (scenario_id)
    │               ├──► fin_forecasts (project_id) ──► fin_scenarios (scenario_id)
    │               ├──► fin_scenarios (project_id)
    │               └──► fin_exports (project_id)
    │
    ├──► audit_logs (actor_id)
    ├──► login_logs (user_id)
    ├──► notification_preferences (user_id)
    └──► impersonation_sessions (admin_id, target_user_id)

kb_knowledge ──► kb_sources (source_id)
    ├──► kb_faq (knowledge_id)
    ├──► kb_rules (knowledge_id)
    └──► kb_knowledge_versions (knowledge_id)
```

### Security Model (Multi-Tenant Isolation)

All data access enforces a **double constraint pattern**:
1. `auth.uid()` — the authenticated user
2. `site_id` ownership — verified via helper functions `owns_site()` and `owns_operation_site()`

RLS policies are enabled on all user-facing tables. Security-definer functions prevent recursive RLS checks.

---

## 5. Data Flow Diagram

### Primary Data Flow: CSV Import → Dashboard

```
[Payment Terminal CSV]
        │
        ▼
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  CSV Upload      │────►│ import-csv-check  │────►│  operations      │
│  (PapaParse)     │     │ (Edge Function)   │     │  table           │
│  Client-side     │     │ Validates, dedupes│     │  (raw data)      │
└─────────────────┘     └──────────────────┘     └────────┬─────────┘
                                                          │
                                                          ▼
                                                ┌──────────────────┐
                                                │ compute-analytics │
                                                │ (Edge Function)   │
                                                │ Aggregates daily  │
                                                └────────┬─────────┘
                                                         │
                                              ┌──────────┴──────────┐
                                              ▼                     ▼
                                    ┌──────────────┐     ┌──────────────┐
                                    │analytics_daily│     │analytics_kpis│
                                    │(pre-computed) │     │(aggregated)  │
                                    └──────┬───────┘     └──────┬───────┘
                                           │                    │
                                           ▼                    ▼
                                    ┌──────────────────────────────┐
                                    │       Dashboard / Charts      │
                                    │  (React Query → UI Components)│
                                    └──────────────────────────────┘
```

### Subscription & Billing Flow

```
[Signup] → [Trial Period] → [Stripe Checkout (create-subscription-checkout)]
                                        │
                                        ▼
                              [stripe-webhook Edge Function]
                                        │
                              ┌─────────┴─────────┐
                              ▼                   ▼
                    [Update subscription    [send-subscription-email]
                     status in DB]
                              │
                              ▼
                    [customer-portal] ← [Manage/Cancel]
                              │
                              ▼
                    [stripe-reconcile-cron] (daily reconciliation)
```

### Financial Projections Flow

```
[Create Project] → [Define Line Items (machines, services)]
        │                      │
        ▼                      ▼
[Set Hypotheses] → [ai-hypothesis-suggest (AI-powered)]
        │
        ▼
[Generate Forecasts (compute monthly P&L)]
        │
        ├──► [Compare Scenarios (baseline vs variants)]
        │
        └──► [Export PDF (generate-financial-pdf) — banking-standard format]
```

---

## 6. Route Structure & Page Classification

### Public Pages (No Authentication Required)

| Route | Page | Purpose |
|---|---|---|
| `/` | Index (Landing) | Marketing landing page |
| `/demo` | DemoPage | Interactive demo with sample data |
| `/login` | Login | Email/password authentication |
| `/signup` | Signup | Account creation |
| `/forgot-password` | ForgotPassword | Password reset request |
| `/reset-password` | ResetPassword | Password reset completion |
| `/pricing` | Pricing | Subscription plans and pricing |
| `/subscribe` | SubscribeSimple | Simplified subscription checkout |
| `/simulateur` | SimulateurPage | Free laundromat simulator |
| `/subscribe-simulator` | SubscribeSimulator | Paid simulator checkout |
| `/billing/success` | BillingSuccess | Post-payment confirmation |
| `/billing/cancel` | BillingCancel | Payment cancellation |
| `/invitation` | AcceptInvitation | Team invitation acceptance |
| `/mentions-legales` | MentionsLegales | Legal notices |
| `/cgv` | CGV | Terms of service |
| `/politique-confidentialite` | PolitiqueConfidentialite | Privacy policy |

### Isolated Layout: Simulation (`SimulationLayout` — no sidebar)

| Route | Page |
|---|---|
| `/simulation` | SimulationProjectPage |
| `/simulation/local` | SimulationLocalPage |
| `/simulation/charges` | SimulationChargesPage |
| `/simulation/results` | SimulationResultsPage |

### Isolated Layout: Financial Projections (`FinProjectLayout` — dedicated nav)

| Route | Page |
|---|---|
| `/projections` | ProjectionsListPage |
| `/projections/machines` | LineItemsPage |
| `/projections/hypotheses` | HypothesesPage |
| `/projections/previsionnel` | PrevisionnelPage |
| `/projections/scenarios` | ScenariosPage |
| `/projections/exports` | ProjectExportsPage |

### Authenticated App Pages (`AppLayout` — sidebar + header)

| Route | Page | Category |
|---|---|---|
| `/dashboard` | Dashboard | **Core** — KPIs, trends, actions |
| `/operations` | Operations | Data — transaction list |
| `/import-export` | ImportExport | Data — CSV import |
| `/exports` | ExportsPage | Data — async exports |
| `/data-history` | DataHistoryPage | Data — import history |
| `/charts/monthly` | MonthlyRevenuePage | Charts |
| `/charts/daily` | DailyRevenuePage | Charts |
| `/charts/payments` | PaymentDistributionPage | Charts |
| `/charts/machines` | MachineTypePage | Charts |
| `/charts/heatmap` | SalesHeatmapPage | Charts |
| `/charts/products` | ProductsRevenuePage | Charts |
| `/charts/annual` | AnnualComparisonPage | Charts |
| `/charts/hourly` | HourlyFrequencyPage | Charts |
| `/charts/daily-freq` | DailyFrequencyPage | Charts |
| `/charts/half-hourly` | HalfHourlyFrequencyPage | Charts |
| `/charts/occupancy` | OccupancyRatePage | Charts |
| `/recommendations` | RecommendationsPage | AI — actionable suggestions |
| `/maintenance` | PredictiveMaintenance | AI — machine health |
| `/profitability` | ProfitabilityPage | Analytics — cost/revenue |
| `/settings` | SettingsPage | Config |
| `/settings/charges` | CostsSettingsPage | Config — fixed costs |
| `/settings/objectives` | GoalsSettingsPage | Config — KPI targets |
| `/laundromat-settings` | LaundromatSettings | Config — site details |
| `/profile` | ProfilePage | User profile |
| `/security` | SecurityPage | User security (MFA, sessions) |
| `/subscription` | SubscriptionManagement | Billing |
| `/billing-history` | BillingHistory | Billing |
| `/roles-management` | RolesManagement | Team — org roles |
| `/company-roles` | CompanyRolesPage | Team — role config |
| `/team` | TeamPage | Team — member management |
| `/getting-started` | GettingStarted | Onboarding guide |
| `/help` | HelpPage | Help & FAQ |
| `/beta` | BetaRulesPage | Beta program info |
| `/audit-logs` | AuditLogsPage | Security — action logs |

### Platform Admin Pages (`AdminLayout` — restricted to super-admins)

| Route | Page | Category |
|---|---|---|
| `/admin` | PlatformAdminHome | Dashboard |
| `/admin/users` | PlatformAdminUsers | User management |
| `/admin/sites` | PlatformAdminSites | Site management |
| `/admin/analytics` | PlatformAdminAnalytics | Platform analytics |
| `/admin/roles` | PlatformAdminRoles | Role management |
| `/admin/permissions` | PlatformAdminPermissions | Permission config |
| `/admin/audit-logs` | PlatformAdminAuditLogs | Audit logs |
| `/admin/login-history` | PlatformAdminLoginHistory | Login history |
| `/admin/system-status` | AdminSystemStatus | System health |
| `/admin/expert-requests` | AdminExpertRequests | Expert requests |
| `/admin/cron-logs` | AdminCronLogs | Cron job logs |
| `/admin/orphan-pages` | PlatformOrphanPages | Dead page detection |
| `/admin/orphan-files` | PlatformOrphanFiles | Orphan file detection |
| `/admin/ai-usage` | PlatformAIUsage | AI usage tracking |
| `/admin/archives` | PlatformAdminArchives | Audit archives |
| `/admin/compliance-reports` | PlatformAdminComplianceReports | Compliance |
| `/admin/recompute-audit` | RecomputeAuditTrail | Analytics audit |
| `/admin/exports` | AdminExportsPage | Export management |
| `/admin/backups` | AdminBackupsPage | Backup management |
| `/admin/knowledge` | KnowledgeBasePage | Knowledge base |
| `/admin/knowledge/sources` | KnowledgeSourcesPage | KB sources |
| `/admin/knowledge/faq` | FaqBuilderPage | FAQ builder |
| `/admin/knowledge/rules` | RulesEnginePage | Rules engine |
| `/admin/knowledge/dts` | DataTrustScorePage | Data trust score |
| `/admin/ab-test` | PlatformABTestPage | A/B testing |
| `/admin/commercial` | CommercialReadinessPage | Launch readiness |
| `/admin/beta/*` | Beta management pages | Beta program ops |
| `/admin/sales/*` | Sales pages (require billing) | Revenue management |

---

## 7. Edge Functions (60+)

Organized by domain:

| Domain | Functions | Count |
|---|---|---|
| **Auth & Security** | auth-signup, log-login, log-admin-login, send-suspicious-login-alert, cleanup-login-logs, require-mfa, verify-mfa-challenge, start/end/get-impersonation, send-login-otp, verify-login-otp, log-login-event, remove-trusted-device, revoke-other-sessions, generate-recovery-codes, verify-recovery-code | 15 |
| **Payments (Stripe)** | create-subscription-checkout, create-simulator-checkout, create-addon-checkout, customer-portal, stripe-webhook, stripe-reconcile-cron, list-invoices | 7 |
| **Analytics** | compute-analytics, compute-analytics-cron, recompute-analytics, import-csv-check | 4 |
| **Exports & PDF** | generate-financial-pdf, generate-fin-export, create-export-job, run-export-job, get-export-download-url | 5 |
| **Audit & Compliance** | cleanup-audit-logs, get-audit-archive-download-url, verify-archive-integrity, verify-archives-bulk, cleanup-audit-archives, monthly-compliance-report, generate-compliance-report, get-compliance-report-download-url, cleanup-compliance-reports, verify-compliance-report-integrity, send-audit-report, send-audit-alert | 12 |
| **Alerts & Notifications** | send-system-alert, send-cron-alert, send-subscription-email, send-permission-alert, check-churn-alert, check-webhook-status, send-orphan-page-alert, trial-reminder, send-suspicious-login-alert | 9 |
| **Beta & Onboarding** | enroll-company-in-beta, end-beta-early, log-beta-event, submit-beta-feedback, beta-inactivity-check, create-demo, reset-demo | 7 |
| **Knowledge & AI** | ai-proxy, ai-hypothesis-suggest, support-chatbot, evaluate-platform-readiness | 4 |
| **Operations** | backup-system, backup-callback, backup-drill-reminder, collect-diagnostics, run-dr-drill, dr-drill-reminder, secrets-health, smoke-tests-cron, permission-tests-cron, import-parser-tests-cron, log-performance, csp-report, log-event | 13 |
| **User & Org** | send-contact, submit-expert-request, send-team-invitation, accept-invitation, validate-invitation, validate-postal-code, fetch-from-siret, close-laundromat, reactivate-laundromat, create-project, create-simulator-lead, send-simulator-summary | 12 |

---

## 8. Directory Structure

```
lavcom-performances/
├── .github/                    # GitHub Actions CI/CD + docs
├── docs/                       # Architecture & security documentation
│   ├── architecture/
│   ├── ops/
│   ├── security/
│   ├── testing/
│   ├── architecture.md
│   └── edge-functions-*.md
├── public/                     # Static assets (favicon, OG images)
├── scripts/                    # Utility scripts
├── supabase/
│   ├── config.toml             # Supabase project config (auto-managed)
│   ├── migrations/             # SQL migrations (ordered, immutable)
│   └── functions/              # 60+ Edge Functions (Deno)
│       ├── _shared/            # Shared utilities (CORS, auth helpers, Stripe client)
│       ├── compute-analytics/
│       ├── stripe-webhook/
│       ├── generate-financial-pdf/
│       └── ... (one folder per function)
├── src/
│   ├── assets/                 # Images, icons, illustrations
│   ├── components/
│   │   ├── ui/                 # shadcn/ui base components (Button, Dialog, Card, etc.)
│   │   ├── layout/             # AppLayout, AppSidebar, MobileHeader, SimulationLayout
│   │   ├── auth/               # ProtectedRoute, LoginForm, SignupForm
│   │   ├── dashboard/          # Dashboard widgets (KPIs, trends, actions)
│   │   ├── charts/             # Chart components (revenue, frequency, heatmap)
│   │   ├── operations/         # Operations table, filters, CSV import
│   │   ├── projections/        # Financial projection UI (hypotheses, line items, forecasts)
│   │   ├── simulation/         # Free simulator components
│   │   ├── admin/              # Admin-level components (impersonation, exports)
│   │   ├── platformAdmin/      # Platform super-admin layout and components
│   │   ├── settings/           # Settings panels (costs, objectives, payment config)
│   │   ├── billing/            # Subscription, pricing, checkout components
│   │   ├── security/           # MFA, session management, login history
│   │   ├── beta/               # Beta program indicators and feedback
│   │   ├── demo/               # Demo mode banner and tutorial
│   │   ├── onboarding/         # Onboarding wizard for new users
│   │   ├── landing/            # Landing page sections
│   │   ├── exports/            # Export job UI
│   │   ├── help/               # Help center components
│   │   ├── cookies/            # Cookie consent banner
│   │   ├── seo/                # SEO meta components
│   │   ├── analytics/          # Route tracking, path tracking
│   │   ├── trust/              # Data trust score components
│   │   ├── dts/                # Data trust score widgets
│   │   ├── feedback/           # Feedback collection
│   │   ├── ux-feedback/        # UX feedback widgets
│   │   ├── trial/              # Trial period banners
│   │   ├── laundromat/         # Site management (close/reactivate)
│   │   ├── profile/            # User profile components
│   │   ├── report/             # Report generation
│   │   ├── storage/            # File storage UI
│   │   ├── guards/             # Feature guards/gates
│   │   └── free-simulator/     # Free simulator qualification
│   ├── config/                 # App configuration constants
│   ├── contexts/               # React contexts (ImpersonationContext)
│   ├── data/                   # Static data / seed data
│   ├── hooks/                  # 90+ custom hooks
│   │   ├── useAuth.ts          # Authentication state
│   │   ├── useOperations.ts    # Operations CRUD
│   │   ├── useSites.ts         # Site management
│   │   ├── useAnalytics.ts     # Analytics data fetching
│   │   ├── useSubscription.ts  # Subscription status
│   │   ├── useFinProjects.ts   # Financial projections
│   │   ├── useAuditLog.ts      # Audit logging
│   │   ├── usePlatformRole.ts  # Admin role detection
│   │   └── ... (90+ hooks)
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts       # Supabase client (auto-generated)
│   │       └── types.ts        # Database types (auto-generated)
│   ├── lib/                    # Utility libraries (i18n config, formatting)
│   ├── locales/                # i18n translation files (FR/EN)
│   ├── pages/                  # Route page components
│   │   ├── admin/              # Admin-scoped pages (beta, exports, backups)
│   │   ├── app/                # App-scoped pages (exports, data history)
│   │   ├── charts/             # Individual chart pages (11 types)
│   │   ├── platform/           # Platform admin pages (20+ pages)
│   │   ├── projections/        # Financial projection pages
│   │   ├── settings/           # Settings sub-pages
│   │   ├── simulation/         # Simulation wizard pages
│   │   ├── Dashboard.tsx
│   │   ├── Operations.tsx
│   │   ├── Login.tsx
│   │   └── ... (50+ page components)
│   ├── types/                  # TypeScript type definitions
│   ├── utils/                  # Pure utility functions
│   ├── App.tsx                 # Root router configuration
│   ├── main.tsx                # Entry point
│   └── index.css               # Global styles + design tokens
├── index.html                  # HTML entry point
├── vite.config.ts              # Vite configuration
├── tailwind.config.ts          # Tailwind + design system tokens
├── tsconfig.json               # TypeScript configuration
├── package.json                # Dependencies and scripts
└── SECURITY.md                 # Security policy
```

---

## 9. Key Features Summary

| Feature | Description |
|---|---|
| **Multi-site Dashboard** | KPIs, health indicators, top-3 actions, performance records, 12-month trends |
| **CSV Import Engine** | Multi-format parser with deduplication, validation, and batch tracking |
| **11 Chart Types** | Monthly/daily revenue, payment distribution, machine types, heatmaps, frequency analysis, occupancy rates |
| **AI Recommendations** | Rule-based + AI-powered actionable suggestions (underutilization, pricing anomalies) |
| **Financial Projections** | Full P&L forecasting with scenarios, hypothesis versioning, and banking-standard PDF export |
| **Free Simulator** | Public 4-step wizard for prospective investors to evaluate a laundromat project |
| **Predictive Maintenance** | Machine health predictions based on usage patterns |
| **Profitability Analysis** | Cost/revenue breakdown with margin calculation |
| **Multi-tenant Security** | RLS-based isolation with `owns_site()` helpers, MFA, OTP, device fingerprinting |
| **Audit & Compliance** | Full action logging, archived with checksums, compliance reports with integrity verification |
| **Beta Program Management** | Enrollment, feedback collection, health monitoring, conversion tracking |
| **Knowledge Base** | Internal KB with versioned articles, FAQ builder, and rules engine |
| **Stripe Integration** | Subscriptions, one-time purchases, customer portal, webhook processing, reconciliation |
| **Team Management** | Invitation system, role-based access, permission audit trails |
| **Data Trust Score** | Confidence metric for data quality affecting recommendation visibility |
| **i18n** | French (primary) and English support via i18next |
| **Dark/Light Mode** | Theme toggle via next-themes |
| **Demo Mode** | Full demo site with sample data and guided tutorial |
| **Disaster Recovery** | Backup system, DR drills with evidence collection, RTO tracking |

---

## 10. Design System

- **CSS Variables**: HSL-based semantic tokens in `index.css` (`--background`, `--foreground`, `--primary`, etc.)
- **Tailwind Config**: Extended with custom colors mapped to CSS variables
- **Component Library**: shadcn/ui with custom variants
- **Typography**: Custom font pairing via Tailwind config
- **Animations**: Framer Motion for page transitions, component animations
- **Responsive**: Mobile-first with dedicated `MobileHeader` and sidebar collapse

---

*This document was auto-generated on March 9, 2026. For architecture details, see `docs/architecture.md`. For security policies, see `SECURITY.md` and `docs/security/`.*
