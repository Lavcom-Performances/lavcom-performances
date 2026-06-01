# Tables Dependency Description

> Cartographie des **83 tables** du schéma `public` et de leurs relations.
> Régénéré à partir de l'état réel de la base.

## 1. Architecture hub-and-spoke

Le schéma s'organise autour de **4 hubs** :

1. **`auth.users`** (managed Supabase) — actor reference pour ~30 tables. **Jamais requêtée directement** : passer par `profiles`.
2. **`organizations`** — multi-site grouping ; parent de sites + invitations + privacy.
3. **`sites`** — frontière de tenant laverie ; parent de operations, analytics, exports, costs.
4. **`fin_projects`** (subgraph isolé) — racine des projections financières.

```
                          auth.users (actor)
                              │
                ┌─────────────┼──────────────┐
                ▼             ▼              ▼
           profiles    organizations     platform_roles
                              │
                              ▼
                            sites ─────────► operations
                              │              │
              ┌──────┬────────┼──────┐       └─► import_batches
              ▼      ▼        ▼      ▼
        analytics  costs   access   exports

           fin_workspaces ► fin_projects ► fin_scenarios ► fin_line_items
                                       ├► fin_hypotheses
                                       ├► fin_forecasts
                                       └► fin_exports
```

## 2. Dépendances détaillées

### 2.1 Autour de `auth.users`

Tables avec `user_id` / `actor_id` / `owner_id` / `created_by` / `invited_by` / `decided_by_user_id` / `owner_user_id` → `auth.users` :

- **Identité** : `profiles.id` (1-1)
- **Tenants** : `organizations.owner_id`, `sites.user_id`, `projects.owner_id`
- **Activité métier** : `operations.user_id`, `import_batches.user_id`, `site_access.user_id`
- **Audit & sécurité** : `audit_logs.actor_id`, `admin_audit_logs.actor_id`, `permission_audit_logs.actor_id`, `privacy_consent_audit_logs.actor_id`
- **Auth & sessions** : `auth_login_events.user_id`, `auth_login_otps.user_id`, `recovery_codes.user_id`, `mfa_challenges.user_id`, `trusted_devices.user_id`, `login_logs.user_id`, `admin_login_history.user_id`, `impersonation_sessions.admin_user_id` & `target_user_id`
- **Billing** : `purchases.user_id`, `subscriptions.user_id`
- **Admin** : `admin_blocked_users.user_id`, `admin_trusted_ips.created_by`, `platform_roles.user_id` & `created_by`, `platform_feature_flags.updated_by`, `user_roles.user_id`, `user_permissions.user_id`
- **Compliance / exports** : `compliance_reports.generated_by`, `export_jobs.created_by`, `audit_log_archives.created_by`, `backup_jobs.created_by`, `dr_drill_runs.operator_id`
- **Team** : `team_invitations.invited_by`
- **Finance** : `fin_workspaces.owner_user_id`, `fin_hypothesis_snapshots.created_by`
- **Workflow** : `orphan_page_reviews.reviewed_by`, `organization_privacy_settings.decided_by_user_id`, `beta_company_overrides.suppressed_by`, `expert_requests.user_id`, `ux_feedback.user_id`, `beta_feedback.user_id`, `contact_messages.user_id` (nullable)
- **Préférences** : `user_chart_preferences.user_id`, `user_goals.user_id`, `notification_preferences.user_id`

### 2.2 Autour de `organizations`

- `sites.organization_id` *(1-N — relation centrale)*
- `team_invitations.organization_id`
- `kpi_objectives.company_id` → `organizations.id`
- `beta_company_overrides.company_id`, `beta_feedback.company_id`
- `permission_webhooks.organization_id`
- `privacy_consent_audit_logs.organization_id`
- `organization_privacy_settings.organization_id`

### 2.3 Autour de `sites`

- `operations.site_id` *(1-N, table la plus volumineuse)*
- `import_batches.site_id`
- `analytics_daily.site_id`, `analytics_kpis.site_id`, `site_analytics_state.site_id`
- `site_access.site_id`, `site_costs.site_id`
- `kpi_objectives.site_id`
- `export_jobs.site_id`, `diagnostics_bundles.site_id`
- `company_payment_config.company_id` → `sites.id` (legacy naming)
- `trust_day.company_id`, `trust_import.company_id`, `trust_line.company_id` → `sites.id` (legacy naming)

### 2.4 Autour de `import_batches`

- `operations.import_batch_id` — relie chaque transaction à son ingestion run

### 2.5 Sous-graphe `fin_*` (projections financières — isolé)

```
fin_workspaces (owner_user_id)
   │
   └─► fin_projects ──┬─► fin_scenarios ──► fin_line_items
                      ├─► fin_hypotheses
                      ├─► fin_hypothesis_snapshots
                      ├─► fin_forecasts (FK fin_scenarios)
                      └─► fin_exports
```

- `fin_line_items.scenario_id` → `fin_scenarios.id`
- `fin_forecasts.scenario_id` → `fin_scenarios.id`
- `fin_hypothesis_snapshots.project_id` → `fin_projects.id`

### 2.6 Sous-graphe `kb_*` (knowledge base IA)

```
kb_sources ──► kb_knowledge ──┬─► kb_knowledge_versions
                              ├─► kb_faq
                              └─► kb_rules
```

### 2.7 Backups & archives

- `backup_files.backup_job_id` → `backup_jobs.id`
- `audit_log_archives` regroupe les batches archivés depuis `audit_logs`
- `dr_drill_history` (rolling) ↔ `dr_drill_runs` (ponctuel)

### 2.8 Stripe ledger

- `stripe_events` *(idempotence webhook — pas de FK)*
- `stripe_invoices` ↔ logique applicative jointe par `subscription_id` / `customer_id`
- `purchases` & `subscriptions` joints par `user_id`

## 3. Tables sans FK (root / log-only)

Ces tables sont accédées **uniquement via prédicats RLS** (`user_id = auth.uid()`) sans foreign key DB pour préserver la performance d'écriture :

- **System** : `system_events`, `cron_logs`, `alert_history`, `rate_limits`, `cron_alert_settings`, `churn_alert_settings`
- **Marketing** : `simulator_leads`, `contact_messages`, `ux_feedback`
- **Telemetry** : `ai_usage_daily`, `stripe_events`, `stripe_invoices`, `file_metadata`
- **Allowlists / config** : `paywall_bypass_allowlist`, `fr_geo_regions`
- **Auth state** : `mfa_challenges`, `auth_login_otps`
- **Préférences** : `notification_preferences`, `user_chart_preferences`, `user_goals`, `user_roles`, `user_permissions`
- **DR** : `dr_drill_runs`, `dr_drill_history`, `expert_requests`
- **Admin** : `login_logs`, `admin_audit_logs`, `admin_login_history`, `impersonation_sessions`, `permission_audit_logs`

## 4. Vues

- `v_data_quality_operations` — vue de monitoring qualité (`DataQualityBlock`).

## 5. Invariants d'isolation

| Règle | Mécanisme |
|-------|-----------|
| Toute table site-scoped enforce `owns_site(site_id)` | Security definer |
| Toute jointure `auth.users` côté app passe par `profiles` | Convention applicative stricte |
| Soft-delete uniquement (`sites.deleted_at IS NULL`) | Préserve l'historique opérationnel |
| `auth.uid()` ET `owns_site()` requis simultanément | Double vérification |
| Aucun trigger ne modifie `auth`, `storage`, `realtime`, `vault`, `supabase_functions` | Schemas réservés |

## 6. Fonctions security-definer pivots

| Fonction | Usage |
|----------|-------|
| `public.has_role(_user_id, _role)` | Check rôle applicatif sans récursion RLS |
| `public.is_platform_admin(_user_id)` | Bypass admin |
| `public.is_super_admin(_user_id)` | Bypass total |
| `public.owns_site(_site_id)` | Tenant check site-scoped |
| `public.owns_operation_site(_site_id)` | Variante operations |
| `public.rpc_has_paywall_bypass(_email)` | Allowlist paywall |
| `public.rpc_create_audit_log(...)` | Insertion sécurisée audit |
| `public.rpc_operations_period_kpis(...)` | Bypass pagination 1000 lignes |

## 7. Métriques

- **83 tables** publiques + **1 vue**
- **~30 tables** avec FK vers `auth.users`
- **~20 tables** site-scoped (`site_id`)
- **~10 tables** finance isolées (`fin_*`)
- **~5 tables** knowledge base (`kb_*`)
- **~25 tables** log-only (sans FK)

---

## Annexe — Prompt de régénération

```
Régénère docs/tables_dependency_description.md à partir de l'état réel de la
base PostgreSQL du projet Lavcom Performances. Étapes obligatoires :

1. Lister TOUTES les tables du schéma public via :
   psql -c "select table_name from information_schema.tables
            where table_schema='public' order by table_name"
   et compter (~83 attendues).

2. Lister toutes les FK :
   psql -c "select tc.table_name, kcu.column_name, ccu.table_name as refs
            from information_schema.table_constraints tc
            join information_schema.key_column_usage kcu using (constraint_name)
            join information_schema.constraint_column_usage ccu using (constraint_name)
            where tc.constraint_type='FOREIGN KEY' and tc.table_schema='public'"

3. Structurer le doc en 7 sections :
   §1 Architecture hub-and-spoke (auth.users, organizations, sites, fin_projects)
      avec diagramme ASCII
   §2 Dépendances détaillées par hub :
      2.1 auth.users (lister toutes les FK actor par catégorie : Identité,
          Tenants, Activité métier, Audit, Auth/sessions, Billing, Admin,
          Compliance, Team, Finance, Workflow, Préférences)
      2.2 organizations
      2.3 sites
      2.4 import_batches
      2.5 fin_* (subgraph isolé avec diagramme ASCII)
      2.6 kb_* (knowledge base avec diagramme ASCII)
      2.7 backups & archives
      2.8 stripe ledger
   §3 Tables sans FK (root/log-only) regroupées par catégorie
   §4 Vues (v_*)
   §5 Invariants d'isolation (tableau règle/mécanisme)
   §6 Fonctions security-definer pivots (tableau)
   §7 Métriques globales

4. Annexe — recopier ce prompt à la fin.

Règles :
- Aucune table inventée — toutes vérifiées en DB.
- Mentionner les conventions de nommage legacy (ex. company_id qui pointe en
  réalité sur sites.id pour trust_*, company_payment_config, kpi_objectives).
- Ne JAMAIS écrire "select … from auth.users" — toujours via profiles.
- Format markdown propre avec listes à puces et diagrammes ASCII.
```
