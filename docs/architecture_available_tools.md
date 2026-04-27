# Lovable — Outils & Fonctionnalités Disponibles

> **Objectif** : Inventaire des outils Lovable utilisables sur ce projet, avec leur
> statut actuel (en place / disponible / non utilisé) et leur utilité pour Lavcom Performances.
>
> **Légende maturité** : 🟢 Stable · 🟡 Beta · 🔴 Expérimental
> **Légende statut** : ✅ Actif · 🟦 Disponible non utilisé · ⚪ Non installé

---

## 1. CI/CD & Déploiement

### 1.1 GitHub Actions ✅

| Aspect | Détail |
|--------|--------|
| **Maturité** | 🟢 Stable |
| **Statut** | ✅ Actif (`.github/workflows/ci.yml`) |
| **Description** | Pipeline lint → tests Vitest → build sur push/PR |

### 1.2 Publication Lovable ✅

| Aspect | Détail |
|--------|--------|
| **Maturité** | 🟢 Stable |
| **Statut** | ✅ Publié sur `lavcom-performanes.lovable.app` |
| **Description** | Déploiement one-click `*.lovable.app` ; backend (Edge Functions, migrations) déployé automatiquement, frontend via bouton "Update" |
| **Utilité** | ⭐⭐⭐⭐⭐ |

### 1.3 Self-Hosting via export GitHub 🟦

| Aspect | Détail |
|--------|--------|
| **Maturité** | 🟢 Stable |
| **Statut** | 🟦 Disponible (sync GitHub actif) |
| **Description** | Code Vite standard exportable vers Vercel, Netlify, Cloudflare Pages |
| **Utilité** | ⭐⭐⭐⭐ — Plan B infra |

### 1.4 QA.tech ⚪

| Aspect | Détail |
|--------|--------|
| **Maturité** | 🟡 Beta (tiers) |
| **Statut** | ⚪ Non installé |
| **Description** | Agent IA testing exploratoire automatisé sur PR GitHub |
| **Utilité** | ⭐⭐⭐ |

---

## 2. Git & Branching

### 2.1 Branch Switching 🔴 Labs

| Aspect | Détail |
|--------|--------|
| **Activation** | Account Settings → Labs |
| **Description** | Travailler sur des feature branches au lieu de `main` |
| **Limitations** | Pas de PR intégrée Lovable, gestion conflits limitée |
| **Utilité** | ⭐⭐⭐⭐ — Multi-développeurs |

### 2.2 Sync bidirectionnelle GitHub ✅

| Aspect | Détail |
|--------|--------|
| **Maturité** | 🟢 Stable |
| **Statut** | ✅ Connecté |

---

## 3. Testing

### 3.1 Vitest ✅

| Aspect | Détail |
|--------|--------|
| **Statut** | ✅ Installé (`vitest ^4.0.16`) |
| **Description** | Tests unitaires/intégration frontend |

### 3.2 Browser Testing intégré 🟦

| Aspect | Détail |
|--------|--------|
| **Maturité** | 🟢 Stable |
| **Statut** | 🟦 Disponible, non systématisé |
| **Description** | Pilotage navigateur headless par l'IA pour E2E |
| **Utilité** | ⭐⭐⭐⭐ |

### 3.3 Edge Function Testing 🟦

| Aspect | Détail |
|--------|--------|
| **Statut** | 🟦 Quelques tests en place (`*_test.ts`) |
| **Description** | Runner Deno avec `--allow-net --allow-env` |
| **Utilité** | ⭐⭐⭐⭐⭐ — Critique sur 91 fonctions |

### 3.4 Test & Live Environments 🟦

| Aspect | Détail |
|--------|--------|
| **Maturité** | 🟡 Beta |
| **Description** | Environnements Test et Live séparés ; données jamais synchronisées |
| **Utilité** | ⭐⭐⭐⭐⭐ |

---

## 4. Base de Données & Backup

### 4.1 Backups quotidiens Lovable Cloud ✅

| Aspect | Détail |
|--------|--------|
| **Statut** | ✅ Actif, rétention ≥ 30 j |
| **Description** | Point-in-time recovery |

### 4.2 Database Linter ✅

| Aspect | Détail |
|--------|--------|
| **Statut** | ✅ Utilisé en pre-publish |
| **Description** | Détection RLS manquantes, policies trop permissives |
| **Utilité** | ⭐⭐⭐⭐⭐ |

### 4.3 Security Scan ✅

| Aspect | Détail |
|--------|--------|
| **Statut** | ✅ Utilisé régulièrement |
| **Description** | Scan complet : RLS, exposition, misconfigs |
| **Utilité** | ⭐⭐⭐⭐⭐ |

### 4.4 Export CSV par table 🟦

| Aspect | Détail |
|--------|--------|
| **Description** | Export manuel table par table depuis Cloud UI |
| **Utilité** | ⭐⭐⭐ |

### 4.5 pg_dump cron (DIY) ⚪

| Aspect | Détail |
|--------|--------|
| **Statut** | ⚪ Non implémenté |
| **Description** | Cron Edge Function → bucket Storage |
| **Utilité** | ⭐⭐⭐ — Backups Lovable suffisent |

---

## 5. Connecteurs & Intégrations

### 5.1 Lovable AI ✅

| Aspect | Détail |
|--------|--------|
| **Statut** | ✅ Utilisé (`ai-proxy`, `support-chatbot`, `ai-hypothesis-suggest`) |
| **Modèles** | Gemini 2.5/3 (Pro/Flash/Lite/Image), GPT-5/5-mini/5-nano/5.2 |
| **Utilité** | ⭐⭐⭐⭐⭐ |

### 5.2 Stripe ✅

| Aspect | Détail |
|--------|--------|
| **Statut** | ✅ Utilisé (~10 edge functions) |
| **Description** | Subscriptions + simulator one-shot + add-ons + customer portal + webhooks |

### 5.3 Resend ✅

| Aspect | Détail |
|--------|--------|
| **Statut** | ✅ Utilisé pour tous les emails transactionnels |
| **Description** | `send-team-invitation`, `send-simulator-summary`, `trial-reminder`, alertes admin |

### 5.4 ScreenshotOne ✅

| Aspect | Détail |
|--------|--------|
| **Statut** | ✅ Utilisé (`run-dr-drill`) |
| **Description** | Capture preuve disaster recovery |

### 5.5 SIRENE / api-adresse.data.gouv.fr ✅

| Aspect | Détail |
|--------|--------|
| **Statut** | ✅ Utilisé (`fetch-from-siret`, `validate-postal-code`) |

### 5.6 ElevenLabs ⚪

| Aspect | Détail |
|--------|--------|
| **Statut** | ⚪ Non installé |
| **Description** | TTS / interfaces vocales |
| **Utilité** | ⭐⭐ |

### 5.7 Firecrawl ⚪

| Aspect | Détail |
|--------|--------|
| **Statut** | ⚪ Non installé |
| **Description** | Web scraping structuré |
| **Utilité** | ⭐⭐⭐ — Veille concurrentielle laveries |

### 5.8 Perplexity ⚪

| Aspect | Détail |
|--------|--------|
| **Statut** | ⚪ Non installé |
| **Description** | Recherche web augmentée IA |
| **Utilité** | ⭐⭐⭐ |

### 5.9 Shopify ⚪

| Aspect | Détail |
|--------|--------|
| **Statut** | ⚪ Non pertinent |

### 5.10 Google Auth ⚪

| Aspect | Détail |
|--------|--------|
| **Statut** | ⚪ Non installé (signup email/password actuellement) |
| **Utilité** | ⭐⭐⭐⭐ — Onboarding clients |

### 5.11 Apple Auth ⚪

| Aspect | Détail |
|--------|--------|
| **Statut** | ⚪ Non installé |
| **Utilité** | ⭐⭐⭐ |

### 5.12 Paddle ⚪

| Aspect | Détail |
|--------|--------|
| **Statut** | ⚪ Stripe utilisé à la place |

### 5.13 GTM (Google Tag Manager) ✅

| Aspect | Détail |
|--------|--------|
| **Statut** | ✅ Actif (`GTM-TQP6TGS3`) avec fallback noscript en `<body>` |

---

## 6. Sécurité & Conformité

### 6.1 Security Center (in-app) ✅

| Aspect | Détail |
|--------|--------|
| **Statut** | ✅ `/security` (score 0-100) |

### 6.2 Audit Logs réaltime ✅

| Aspect | Détail |
|--------|--------|
| **Statut** | ✅ `RecentActivityWidget`, `OrgActivityFeed` (Supabase realtime) |

### 6.3 Kill switches (Safe Mode) ✅

| Aspect | Détail |
|--------|--------|
| **Statut** | ✅ `platform_feature_flags` |

### 6.4 Admin Impersonation ✅

| Aspect | Détail |
|--------|--------|
| **Statut** | ✅ Max 30 min, 10/jour |

### 6.5 Disaster Recovery framework ✅

| Aspect | Détail |
|--------|--------|
| **Statut** | ✅ TAEX-219/220, drill mensuel |

---

## 7. Fonctionnalités Labs / Editor

| Feature | Maturité | Statut | Description |
|---------|----------|--------|-------------|
| **Plan Mode** | 🟢 Stable | 🟦 | L'IA planifie avant de coder |
| **Visual Edits** | 🟢 Stable | 🟦 | Édition directe sans prompt |
| **Custom Knowledge** | 🟢 Stable | ✅ | Mémoire projet (`mem://`) |
| **Branch Switching** | 🔴 Labs | ⚪ | Feature branches Git |
| **Design Templates** | 🟢 Stable | ⚪ | Templates de design |

---

## 8. Recommandations pour Lavcom Performances

### Priorité Haute

| Outil | Raison |
|-------|--------|
| **Edge Function Tests systématiques** | 91 fonctions, couverture actuelle partielle |
| **Google Auth** | Réduire friction signup |
| **DR Drill mensuel** | Déjà cron, vérifier preuve `dr_drill_runs` |

### Priorité Moyenne

| Outil | Raison |
|-------|--------|
| **Branch Switching** | Dev parallèle sans risque sur `main` |
| **QA.tech** | Régression visuelle sur PR |

### Priorité Basse

| Outil | Raison |
|-------|--------|
| **Firecrawl** | Veille concurrentielle laveries |
| **Apple Auth** | Si segment iOS croît |

---

## 9. Matrice de Compatibilité

```
┌──────────────────────┐
│  GitHub (Source)     │◄──── Sync bidirectionnelle ✅
│  + Actions CI/CD     │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐    ┌──────────────────────┐
│  Lovable Editor      │───►│  Lovable Cloud       │
│  ├─ Visual Edits     │    │  ├─ PostgreSQL (83 tbl)
│  ├─ Browser Test     │    │  ├─ Edge Functions (91)
│  ├─ Plan Mode        │    │  ├─ Auth + MFA       │
│  └─ Custom Knowledge │    │  ├─ Storage          │
└────────┬─────────────┘    │  └─ Realtime         │
         │                  └────────┬─────────────┘
         ▼                           │
┌──────────────────────┐             ▼
│  Publish             │    ┌──────────────────────┐
│  ├─ lovable.app ✅   │    │  Connectors          │
│  └─ Custom Domain    │    │  ├─ Stripe ✅        │
└──────────────────────┘    │  ├─ Resend ✅        │
                            │  ├─ Lovable AI ✅    │
                            │  ├─ ScreenshotOne ✅ │
                            │  ├─ Google Auth ⚪   │
                            │  ├─ ElevenLabs ⚪    │
                            │  ├─ Firecrawl ⚪     │
                            │  └─ Perplexity ⚪    │
                            └──────────────────────┘
```

---

*Document régénéré le 2026-04-27 — Projet Lavcom Performances*

---

## Annexe — Prompt de régénération

```
Régénère docs/architecture_available_tools.md pour Lavcom Performances en
inventoriant les outils Lovable disponibles. Pour chaque outil, indique :
- Maturité 🟢 Stable / 🟡 Beta / 🔴 Expérimental
- Statut PROJET ✅ Actif / 🟦 Disponible non utilisé / ⚪ Non installé
- Description courte
- Utilité ⭐ → ⭐⭐⭐⭐⭐

Sections obligatoires :
1. CI/CD & Déploiement (GitHub Actions, Publication Lovable, Self-hosting,
   QA.tech)
2. Git & Branching (Branch Switching Labs, Sync GitHub)
3. Testing (Vitest, Browser Testing, Edge Function Testing, Test/Live envs)
4. Base de Données & Backup (Backups quotidiens, Linter, Security Scan,
   Export CSV, pg_dump DIY)
5. Connecteurs & Intégrations — vérifier dans le code lesquels sont
   réellement utilisés :
   - Lovable AI (chercher ai-proxy, support-chatbot, ai-hypothesis-suggest)
   - Stripe (~10 edge functions)
   - Resend (chercher resend.dev / RESEND_API_KEY dans send-* functions)
   - ScreenshotOne (run-dr-drill)
   - SIRENE / api-adresse.data.gouv.fr (fetch-from-siret, validate-postal-code)
   - ElevenLabs, Firecrawl, Perplexity, Shopify, Paddle (tous ⚪ a priori)
   - Google Auth, Apple Auth (vérifier supabase auth providers)
   - GTM (chercher GTM- dans index.html)
6. Sécurité & Conformité (Security Center /security, Audit Logs realtime,
   Kill switches platform_feature_flags, Admin Impersonation, DR framework)
7. Fonctionnalités Labs / Editor (Plan Mode, Visual Edits, Custom Knowledge,
   Branch Switching, Design Templates)
8. Recommandations Haute / Moyenne / Basse priorité spécifiques au métier
   laveries
9. Matrice de compatibilité ASCII (GitHub ↔ Editor ↔ Cloud ↔ Connectors)
   avec compteurs réels (X tables, Y edge functions)
10. Annexe — Prompt de régénération (recopier ce bloc)

Règles :
- Vérifier chaque outil dans le code avant de marquer ✅. Ne pas inventer.
- Compteurs (tables, edge functions, modèles AI) à vérifier en DB / fs.
- Markdown propre avec tableaux 2 colonnes "Aspect | Détail" pour chaque outil.
```
