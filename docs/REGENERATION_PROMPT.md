# Documentation Regeneration — Master Prompt

> **Objet** : Prompt unique et reproductible pour régénérer en une seule passe l'ensemble
> de la documentation `/docs` à partir de l'état réel du code et de la base de données.
>
> **Cible** : tout assistant IA disposant d'accès au repo + à la base PostgreSQL
> Lovable Cloud du projet Lavcom Performances.

---

## Mode d'emploi

1. Copier-coller intégralement la section ["Prompt"](#prompt) ci-dessous dans une
   nouvelle conversation Lovable.
2. L'IA doit produire **exactement 8 fichiers** (4 markdown + 3 mermaid + ce master),
   strictement alignés sur l'état réel du code/DB.
3. Chaque fichier régénéré doit inclure son propre prompt de régénération individuel
   en annexe (pour permettre une régénération ciblée).

---

## Sources de vérité à interroger AVANT de générer

L'IA doit obligatoirement exécuter ces commandes en début de session et baser
sa génération sur leurs résultats — **aucune valeur ne doit être inventée** :

```bash
# 1. Liste exhaustive des edge functions (attendu ~91)
ls supabase/functions/ | sort
ls supabase/functions/ | wc -l

# 2. Inventaire complet des tables publiques (attendu ~83)
psql -c "SELECT table_name FROM information_schema.tables
         WHERE table_schema='public' ORDER BY table_name"

# 3. Foreign keys complètes
psql -c "SELECT tc.table_name, kcu.column_name, ccu.table_name AS refs_table
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu USING (constraint_name)
         JOIN information_schema.constraint_column_usage ccu USING (constraint_name)
         WHERE tc.constraint_type='FOREIGN KEY' AND tc.table_schema='public'
         ORDER BY tc.table_name"

# 4. Vues
psql -c "SELECT table_name FROM information_schema.views WHERE table_schema='public'"

# 5. Fonctions security definer
psql -c "SELECT routine_name FROM information_schema.routines
         WHERE routine_schema='public' AND security_type='DEFINER'"

# 6. RLS désactivée (doit être vide)
psql -c "SELECT tablename FROM pg_tables
         WHERE schemaname='public' AND rowsecurity=false"

# 7. Appels inter-edge functions
rg "functions/v1/([a-z0-9-]+)" -or '\$1' supabase/functions/ --no-filename | sort -u

# 8. Hooks frontend (attendu ~90)
ls src/hooks/ | wc -l

# 9. Storage buckets
psql -c "SELECT id, public FROM storage.buckets"
```

---

## Prompt

> **Copier ce bloc tel quel dans une nouvelle conversation.**

```
Régénère intégralement la documentation /docs du projet Lavcom Performances
en partant de l'état RÉEL du repo (jamais d'invention). Avant tout, exécute
les 9 commandes listées dans docs/REGENERATION_PROMPT.md §"Sources de vérité"
pour récupérer : liste des 91 edge functions, 83 tables, FK complètes, vues,
fonctions security definer, statut RLS, call-graph inter-fonctions, count
des hooks, buckets storage.

Ensuite produis EXACTEMENT ces 7 fichiers (toujours en français) :

────────────────────────────────────────────────────────────────────────────
1. docs/SECURITY.md
────────────────────────────────────────────────────────────────────────────
18 sections : versions supportées · signalement vulnérabilité (PGP, SLA
48h, délais correctifs 72h/7j/30j) · auth & autorisation (MFA TOTP, OTP
email, recovery codes, trusted devices, sessions, leaked password,
password strength) · RBAC (platform_roles, user_roles, has_role,
is_platform_admin, is_super_admin, ProtectedRoute order, paywall_bypass) ·
impersonation admin (30min/10 jour, edge functions start-/end-/get-) ·
isolation multi-tenant (owns_site, owns_operation_site, soft-delete) ·
audit & logs (tableau exhaustif _logs/_events + TTL + cleanup function) ·
PII (masking email/IP, sanitization CSV ', secret redaction ai-proxy) ·
edge functions security (7 patterns + tableau rate_limits) · kill switches
platform_feature_flags · DR (run-dr-drill, ScreenshotOne, SHA256,
dr_drill_runs) · CI/CD supply chain (Dependabot, CodeQL, TruffleHog, npm
audit, Snyk) · CSP & frontend (enforcement meta, anon/publishable only) ·
Stripe (signature webhook, stripe-reconcile-cron, guest checkout corsHeaders) ·
RLS résumé (tableau profiles/sites/operations/etc) · GDPR · checklist
annuelle (rotations, revue platform_roles, DR drill, restore test, pen test) ·
annexe prompt régénération.

────────────────────────────────────────────────────────────────────────────
2. docs/security-checklist.md
────────────────────────────────────────────────────────────────────────────
13 sections : §0 backups & DR (config + historique restore + procédure +
modèle texte) · §1 auth & comptes (cases à cocher MFA/OTP/trusted/sessions/
rate limit) · §2 RLS (query d'audit + tableau exhaustif tables critiques
~25 lignes regroupées par domaine + tests SQL d'isolation) · §3 rate
limiting (tableau scope/limite/fenêtre/edge function) · §4 logs & PII
(règles + exemples bons/mauvais) · §5 storage buckets (avatars, exports,
compliance-reports, audit-archives, backup-files, diagnostics) · §6 edge
functions 91 total (checks transverses + liste exhaustive verify_jwt=false :
create-simulator-checkout, create-simulator-lead, send-simulator-summary,
send-contact, csp-report, validate-postal-code, fetch-from-siret,
stripe-webhook, backup-callback) · §7 frontend (CSP enforcement, pas de
secrets) · §8 responsive · §9 Stripe & billing · §10 kill switches · §11
cron jobs (TOUS les *-cron / *-reminder / cleanup-* avec fréquence + alerte) ·
§12 commandes utiles (QA, RLS audit, linter, cleanup) · annexe prompt
régénération.

────────────────────────────────────────────────────────────────────────────
3. docs/tables_dependency_description.md
────────────────────────────────────────────────────────────────────────────
7 sections : §1 architecture hub-and-spoke (auth.users, organizations,
sites, fin_projects) avec diagramme ASCII · §2 dépendances détaillées
(2.1 auth.users par catégorie : Identité/Tenants/Activité métier/Audit/
Auth-sessions/Billing/Admin/Compliance/Team/Finance/Workflow/Préférences,
2.2 organizations, 2.3 sites, 2.4 import_batches, 2.5 fin_* avec ASCII,
2.6 kb_* avec ASCII, 2.7 backups & archives, 2.8 stripe ledger) · §3
tables sans FK (root/log-only) regroupées · §4 vues (v_*) · §5
invariants d'isolation · §6 fonctions security-definer pivots · §7
métriques globales (83 tables, ~30 FK auth, ~20 site-scoped, ~10 fin_*,
~5 kb_*, ~25 log-only) · annexe prompt régénération.
Mentionner conventions legacy : company_id qui pointe en réalité sur
sites.id pour trust_*, company_payment_config, kpi_objectives.

────────────────────────────────────────────────────────────────────────────
4. docs/architecture_available_tools.md
────────────────────────────────────────────────────────────────────────────
9 sections : CI/CD & Déploiement · Git & Branching · Testing · Base de
Données & Backup · Connecteurs (vérifier dans le code lesquels sont
réellement utilisés : Lovable AI ✅ via ai-proxy/support-chatbot/
ai-hypothesis-suggest, Stripe ✅, Resend ✅ via send-*, ScreenshotOne ✅
via run-dr-drill, SIRENE ✅ via fetch-from-siret, ElevenLabs/Firecrawl/
Perplexity/Shopify ⚪, Google/Apple Auth ⚪, GTM ✅ GTM-TQP6TGS3) ·
Sécurité (Security Center /security, Audit Logs realtime, Kill switches,
Impersonation, DR) · Labs/Editor · Recommandations Haute/Moyenne/Basse
priorité métier laveries · Matrice compatibilité ASCII · annexe prompt
régénération.
Pour chaque outil : maturité 🟢/🟡/🔴, statut projet ✅/🟦/⚪, description,
utilité ⭐.

────────────────────────────────────────────────────────────────────────────
5. docs/edge-functions-overview.mermaid
────────────────────────────────────────────────────────────────────────────
graph TB avec subgraphs : Frontend (App + /simulateur public), Auth (12
fonctions), Payment (10), Analytics (5), Team (8), Notifications (10),
Features (11), Admin (10), Audit (5), DR (5), CSV (4), Cron tests (4),
Utilities (3), External (Stripe, Resend, SIRENE, Lovable AI,
ScreenshotOne, Slack), DB (PostgreSQL+Auth+Storage+Realtime). Inclure
les flux principaux (App → fonctions, Stripe → webhook, crons → email/
slack, AI → gateway). Pas d'emojis dans la syntaxe Mermaid (lexer
errors).

────────────────────────────────────────────────────────────────────────────
6. docs/edge-functions-dependencies.mermaid
────────────────────────────────────────────────────────────────────────────
graph LR — sous-graphe "Functions appelées" (compute-analytics,
recompute-analytics, send-subscription-email, send-system-alert,
send-cron-alert, send-suspicious-login-alert, send-simulator-summary) +
sous-graphe "Functions appelantes" (stripe-webhook, stripe-reconcile-cron,
compute-analytics-cron, import-csv-check, import-parser-tests-cron,
log-admin-login, run-dr-drill, backup-callback, permission-tests-cron,
create-simulator-lead) + arêtes vérifiées par grep
"functions/v1/[a-z-]+".

────────────────────────────────────────────────────────────────────────────
7. docs/edge-functions-stripe-flow.mermaid
────────────────────────────────────────────────────────────────────────────
flowchart TD : User → 3 entry points checkout (sub/sim/addon) → Stripe →
stripe-webhook → switch sur metadata.type (simulator → handleSimulator,
addon → handleAddon, subscription → handleSubscriptionCheckout) + autres
events (subscription.updated/deleted, invoice.paid/payment_failed) →
tables (profiles, purchases, subscriptions, stripe_invoices, stripe_events)
+ emails (send-subscription-email, send-simulator-summary, send-system-alert)
+ reconciliation cron + customer self-service (customer-portal, list-invoices).

────────────────────────────────────────────────────────────────────────────
RÈGLES TRANSVERSALES
────────────────────────────────────────────────────────────────────────────
- Aucune valeur, table, fonction, limite, route ou nom inventé : tout doit
  être vérifié dans le code/DB.
- Côté communication user, ne jamais écrire "Supabase" — utiliser "Lovable
  Cloud" / "backend" / "authentification" / "fonctions backend". Côté
  technique, les noms exacts (table, edge function, RLS) sont obligatoires.
- Format Markdown propre, tableaux 2-3 colonnes, sections numérotées,
  emojis statut autorisés UNIQUEMENT dans les .md (jamais dans les .mermaid).
- Soft-delete strict : sites.deleted_at IS NULL partout, jamais de hard
  delete.
- Toute jointure auth.users côté app passe par profiles.
- Date de régénération = date du jour.
- Chaque .md inclut son propre bloc "Annexe — Prompt de régénération" pour
  permettre une régénération ciblée d'un seul fichier.
- Vérifier visuellement les .mermaid (rendu) avant validation.
```

---

## Régénération ciblée d'un seul fichier

Chaque fichier markdown contient son propre prompt en annexe. Pour ne
régénérer qu'un seul fichier, copier uniquement l'annexe correspondante.

| Fichier | Section annexe |
|---------|----------------|
| `docs/SECURITY.md` | "Annexe — Prompt de régénération" |
| `docs/security-checklist.md` | "Annexe — Prompt de régénération" |
| `docs/tables_dependency_description.md` | "Annexe — Prompt de régénération" |
| `docs/architecture_available_tools.md` | "Annexe — Prompt de régénération" |
| `docs/edge-functions-*.mermaid` | Section 5/6/7 du prompt master ci-dessus |

---

*Document master — dernière régénération : 2026-04-27*
