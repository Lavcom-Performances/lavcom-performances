# Tables Dependency Description

This document describes the foreign-key relationships between tables in the `public` schema. All FK targets to `auth.users` represent ownership/actor links — never query `auth.users` directly; join via `profiles`.

## Hub-and-spoke architecture

The schema has **three central hubs**:

1. **`auth.users`** (Supabase managed) — actor reference for ~30 tables.
2. **`organizations`** — multi-site grouping; parent of sites + invitations + privacy.
3. **`sites`** — laundromat-level tenant boundary; parent of operations, analytics, exports, costs.

A fourth, isolated hub:

4. **`fin_projects`** — root of the financial projections subsystem.

## Detailed dependencies

### Around `auth.users`
Tables with `user_id` / `actor_id` / `owner_id` / `created_by` / `invited_by` / `decided_by_user_id` → `auth.users`:
- `profiles.id` (1-1), `organizations.owner_id`, `sites.user_id`
- `operations.user_id`, `import_batches.user_id`, `site_access.user_id`
- `audit_logs.actor_id`, `purchases.user_id`, `subscriptions.user_id`
- `auth_login_events`, `auth_login_otps`, `recovery_codes`, `admin_blocked_users`, `admin_trusted_ips.created_by`
- `platform_roles.user_id` & `created_by`, `platform_feature_flags.updated_by`
- `compliance_reports.generated_by`, `export_jobs.created_by`, `team_invitations.invited_by`
- `fin_workspaces.owner_user_id`, `fin_hypothesis_snapshots.created_by`
- `orphan_page_reviews.reviewed_by`, `organization_privacy_settings.decided_by_user_id`
- `beta_company_overrides.suppressed_by`, `projects.owner_id`

### Around `organizations`
- `sites.organization_id` (1-N) — most important link
- `team_invitations.organization_id`
- `kpi_objectives.company_id`
- `beta_company_overrides.company_id`, `beta_feedback.company_id`
- `permission_webhooks.organization_id`
- `privacy_consent_audit_logs.organization_id`, `organization_privacy_settings.organization_id`

### Around `sites`
- `operations.site_id` (1-N, very large)
- `import_batches.site_id`
- `analytics_daily.site_id`, `analytics_kpis.site_id`, `site_analytics_state.site_id`
- `site_access.site_id`, `site_costs.site_id`
- `kpi_objectives.site_id`
- `export_jobs.site_id`, `diagnostics_bundles.site_id`
- `company_payment_config.company_id` → `sites`
- `trust_day.company_id`, `trust_import.company_id`, `trust_line.company_id` → `sites`

### Around `import_batches`
- `operations.import_batch_id` — links each transaction to its ingestion run

### Around `fin_*` (isolated subgraph)
```
fin_workspaces ──► fin_projects ──┬─► fin_scenarios ──► fin_line_items
                                  ├─► fin_hypotheses
                                  ├─► fin_hypothesis_snapshots
                                  ├─► fin_forecasts (also FK fin_scenarios)
                                  └─► fin_exports
```
- `fin_line_items.scenario_id` → `fin_scenarios`
- `fin_forecasts.scenario_id` → `fin_scenarios`

### Around `kb_*` (Knowledge Base subgraph)
```
kb_sources ──► kb_knowledge ──┬─► kb_knowledge_versions
                              ├─► kb_faq
                              └─► kb_rules
```

### Around `backup_jobs`
- `backup_files.backup_job_id`

## Tables with no FKs (root / log-only)
- `system_events`, `cron_logs`, `alert_history`, `rate_limits`
- `simulator_leads`, `contact_messages`, `ux_feedback`
- `ai_usage_daily`, `stripe_events`, `stripe_invoices`
- `paywall_bypass_allowlist`, `fr_geo_regions`, `file_metadata`
- `mfa_challenges`, `notification_preferences`, `user_chart_preferences`, `user_goals`, `user_roles`, `user_permissions`
- `dr_drill_runs`, `dr_drill_history`, `expert_requests`
- `churn_alert_settings`, `cron_alert_settings`
- `login_logs`, `admin_audit_logs`, `admin_login_history`, `impersonation_sessions`, `permission_audit_logs`

These are accessed exclusively through RLS predicates (e.g., `user_id = auth.uid()`) without database-level FKs to keep writes fast.

## Isolation invariants
- All site-scoped tables enforce RLS via `owns_site(site_id)` security-definer function.
- All organization-scoped tables enforce RLS via membership check on `organizations.owner_id` or `team_invitations`.
- All `auth.users` joins go through `profiles` in the application layer.
- Soft delete: `sites.deleted_at IS NULL` is enforced everywhere — never hard-delete (preserves operational history).
