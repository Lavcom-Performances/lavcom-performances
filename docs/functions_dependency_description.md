# Functions Dependency Description

This document maps the call graph between the ~95 Deno Edge Functions in `supabase/functions/`.

## Caller → Callee map (server-to-server)

Direct invocations between edge functions (via `fetch ${SUPABASE_URL}/functions/v1/<fn>`):

| Caller | Callee | Purpose |
|---|---|---|
| `compute-analytics-cron` | `compute-analytics` | Per-site KPI compute loop |
| `compute-analytics-cron` | `send-cron-alert` | Alert on partial failure |
| `compute-analytics-cron` | `send-system-alert` | Critical failure escalation |
| `create-simulator-lead` | `send-simulator-summary` | Resend email after free simulator |
| `stripe-webhook` | `send-subscription-email` | Confirmation after Stripe event |
| `stripe-webhook` | `send-system-alert` | Webhook processing failure |
| `stripe-reconcile-cron` | `send-system-alert` | Reconciliation drift |
| `import-csv-check` | `send-system-alert` | CSV validation failure |
| `import-parser-tests-cron` | `send-system-alert` | Adapter regression |
| `permission-tests-cron` | `send-system-alert` | RLS guard regression |
| `backup-callback` | `send-system-alert` | Backup pipeline failure |
| `log-admin-login` | `send-suspicious-login-alert` | Admin login risk trigger |
| `run-dr-drill` | `recompute-analytics` | Validate DR analytics integrity |

## Frontend → Edge Function entrypoints

40+ functions invoked by the React app via `supabase.functions.invoke()`. Examples:
- **Auth/Security**: `auth-signup`, `log-login`, `log-login-event`, `log-admin-login`, `generate-recovery-codes`, `verify-mfa-challenge`, `remove-trusted-device`, `revoke-other-sessions`
- **Stripe**: `create-subscription-checkout`, `create-simulator-checkout`, `create-addon-checkout`, `customer-portal`, `list-invoices`
- **Analytics/Imports**: `compute-analytics`, `recompute-analytics`, `import-csv-check`
- **Exports/PDF**: `create-export-job`, `run-export-job`, `get-export-download-url`, `generate-financial-pdf`, `generate-compliance-report`, `get-compliance-report-download-url`, `get-audit-archive-download-url`
- **Admin**: `start-impersonation`, `end-impersonation`, `get-impersonation-session`, `evaluate-platform-readiness`, `collect-diagnostics`
- **Beta**: `enroll-company-in-beta`, `end-beta-early`, `submit-beta-feedback`, `submit-expert-request`, `log-beta-event`, `check-churn-alert`
- **Simulator/Demo**: `create-simulator-lead`, `create-demo`, `reset-demo`, `create-project`, `close-laundromat`, `reactivate-laundromat`
- **AI**: `ai-hypothesis-suggest`, `support-chatbot`, `ai-proxy`
- **Misc**: `fetch-from-siret`, `validate-postal-code`, `validate-invitation`, `accept-invitation`, `send-contact`, `log-event`, `log-performance`

## pg_cron → Edge Function triggers

Scheduled via `pg_cron` HTTP requests (Supabase Vault holds service role key):
- `compute-analytics-cron` — nightly analytics recompute
- `stripe-reconcile-cron` — nightly Stripe drift fix
- `import-parser-tests-cron` — adapter regression tests
- `permission-tests-cron` — RLS guardrail tests
- `smoke-tests-cron` — global smoke tests
- `cleanup-audit-logs`, `cleanup-audit-archives`, `cleanup-compliance-reports`, `cleanup-login-logs` — retention
- `monthly-compliance-report`, `verify-archives-bulk` — monthly compliance & integrity
- `trial-reminder` — daily reminder for expiring 14-day trials
- `beta-inactivity-check` — beta engagement monitoring
- `backup-drill-reminder`, `dr-drill-reminder` — DR scheduling
- `check-webhook-status`, `secrets-health` — infra health probes

## Stripe webhook (external → us)

`stripe-webhook` is the single ingress for Stripe events. It:
1. Verifies Stripe signature
2. Inserts into `stripe_events` (idempotent dedupe)
3. Upserts `subscriptions` / `purchases` / `stripe_invoices`
4. Calls `send-subscription-email` for user-facing confirmations
5. Escalates to `send-system-alert` on failure

## Domain clusters

```
┌──────────── Auth & MFA ────────────┐   ┌──────── Stripe / Billing ────────┐
│ auth-signup, log-login*,           │   │ create-*-checkout, customer-     │
│ send-login-otp, verify-login-otp,  │   │ portal, stripe-webhook,          │
│ require-mfa, verify-mfa-challenge, │   │ stripe-reconcile-cron,           │
│ generate/verify-recovery-codes,    │   │ list-invoices,                   │
│ trusted-devices, suspicious-login  │   │ send-subscription-email,         │
└────────────────────────────────────┘   │ trial-reminder                   │
                                         └──────────────────────────────────┘
┌──────── Analytics / Imports ───────┐   ┌────── Exports & PDF ─────────────┐
│ compute-analytics(+cron),          │   │ create/run-export-job,           │
│ recompute-analytics,               │   │ get-export-download-url,         │
│ import-csv-check,                  │   │ generate-financial-pdf,          │
│ import-parser-tests-cron           │   │ generate-fin-export,             │
└────────────────────────────────────┘   │ generate/monthly-compliance-     │
                                         │ report, archive integrity        │
                                         └──────────────────────────────────┘
┌──────── Audit & Compliance ────────┐   ┌────── Alerts & Email ────────────┐
│ cleanup-* (retention),             │   │ send-system-alert, send-cron-    │
│ verify-archive(s)-integrity,       │   │ alert, send-orphan-page-alert,   │
│ get-audit-archive-download-url,    │   │ send-permission-alert,           │
│ send-audit-alert/report            │   │ send-team/admin-invitation,      │
│ csp-report                         │   │ send-contact, send-suspicious-   │
└────────────────────────────────────┘   │ login-alert, send-simulator-     │
                                         │ summary                          │
                                         └──────────────────────────────────┘
┌──────────── DR & Backups ──────────┐   ┌────── Admin & Tooling ───────────┐
│ backup-system, backup-callback,    │   │ start/end/get-impersonation-     │
│ backup-drill-reminder,             │   │ session, evaluate-platform-      │
│ run-dr-drill, dr-drill-reminder,   │   │ readiness, secrets-health,       │
│ collect-diagnostics, log-event,    │   │ check-webhook-status             │
│ log-performance                    │   └──────────────────────────────────┘
└────────────────────────────────────┘
┌─────────── AI & Misc ──────────────┐   ┌────── Beta & Demo ───────────────┐
│ ai-proxy, ai-hypothesis-suggest,   │   │ enroll-company-in-beta,          │
│ support-chatbot, fetch-from-siret, │   │ end-beta-early, beta-inactivity- │
│ validate-postal-code,              │   │ check, log-beta-event,           │
│ validate/accept-invitation         │   │ submit-beta-feedback,            │
└────────────────────────────────────┘   │ submit-expert-request,           │
                                         │ check-churn-alert, create/reset- │
                                         │ demo, close/reactivate-          │
                                         │ laundromat, create-project,      │
                                         │ create-simulator-lead            │
                                         └──────────────────────────────────┘
```

## Critical guardrails
- All guest-callable functions (`create-simulator-checkout`, `create-simulator-lead`, `send-contact`) MUST include `corsHeaders` and validate inputs.
- All analytics-processing functions MUST paginate (Edge >1000 rows limit).
- All cron failures must log to `system_events` (severity=`warn`) and call `send-cron-alert` / `send-system-alert`.
- `stripe-reconcile-cron` is tolerant: ignores subscriptions/customers missing in Stripe (don't crash on rotated test mode).
- Impersonation lifecycle (`start/end/get-impersonation-session`) enforces 30 min max, 10/day, blocks `/admin` access during sessions.
