# Lovable — Outils & Fonctionnalités Disponibles (Non Installés)

> **Objectif** : Inventaire des outils et fonctionnalités disponibles dans l'écosystème Lovable
> qui ne sont pas encore utilisés dans ce projet. Classés par catégorie avec niveau de maturité.
>
> **Légende maturité** :
> - 🟢 **Stable** — Production-ready, recommandé
> - 🟡 **Beta** — Fonctionnel mais en évolution, quelques limitations
> - 🔴 **Expérimental** — Labs/Preview, peut changer ou être retiré

---

## 1. CI/CD & Déploiement

### 1.1 GitHub Actions (déjà en place ✅)

| Aspect | Détail |
|--------|--------|
| **Maturité** | 🟢 Stable |
| **Statut projet** | Déjà configuré (`.github/workflows/ci.yml`) |
| **Description** | Pipeline lint → tests → build sur push/PR |

> **Note** : Le projet utilise déjà GitHub Actions. C'est l'approche recommandée pour le CI/CD avec Lovable.

### 1.2 Publication Lovable (Built-in)

| Aspect | Détail |
|--------|--------|
| **Maturité** | 🟢 Stable |
| **Statut** | Disponible mais non publié |
| **Description** | Déploiement one-click vers `*.lovable.app` avec domaine custom possible |
| **Fonctionnement** | Bouton "Publish" dans l'éditeur. Les changements frontend nécessitent un clic "Update" ; les changements backend (Edge Functions, migrations) se déploient automatiquement |
| **Utilité** | ⭐⭐⭐⭐⭐ — Zéro config, production immédiate |

### 1.3 Self-Hosting via GitHub Export

| Aspect | Détail |
|--------|--------|
| **Maturité** | 🟢 Stable |
| **Statut** | Non utilisé |
| **Description** | Le code GitHub est un projet Vite standard déployable sur Vercel, Netlify, Cloudflare Pages, ou tout serveur statique |
| **Utilité** | ⭐⭐⭐⭐ — Pour hébergement sur infrastructure propre |

### 1.4 QA.tech (CI/CD Testing externe)

| Aspect | Détail |
|--------|--------|
| **Maturité** | 🟡 Beta (service tiers) |
| **Statut** | Non installé |
| **Description** | Agent IA qui fait du testing exploratoire automatisé sur les Pull Requests GitHub. Détecte les régressions visuelles et fonctionnelles |
| **Intégration** | Se branche sur les PR via GitHub Actions, crée des preview deployments et teste automatiquement |
| **Utilité** | ⭐⭐⭐ — Intéressant pour QA automatisée sur PR |

---

## 2. Git & Branching

### 2.1 GitHub Branch Switching

| Aspect | Détail |
|--------|--------|
| **Maturité** | 🔴 Expérimental (Labs) |
| **Activation** | Account Settings → Labs → "GitHub Branch Switching" |
| **Description** | Permet de choisir sur quelle branche Lovable commit. Par défaut, tout va sur `main`. Avec cette option, on peut travailler sur des feature branches |
| **Limitations** | Support limité des conflits de merge, pas de PR intégrée dans Lovable, gestion des branches via GitHub uniquement |
| **Utilité** | ⭐⭐⭐⭐ — Essentiel pour workflows multi-développeurs |

### 2.2 Sync Bidirectionnelle GitHub

| Aspect | Détail |
|--------|--------|
| **Maturité** | 🟢 Stable |
| **Statut projet** | ✅ Déjà connecté |
| **Description** | Push depuis Lovable → GitHub automatique. Push depuis IDE local → GitHub → sync dans Lovable en temps réel |

---

## 3. Testing

### 3.1 Vitest (déjà installé ✅)

| Aspect | Détail |
|--------|--------|
| **Maturité** | 🟢 Stable |
| **Statut** | Installé (`vitest ^4.0.16`) |
| **Description** | Tests unitaires et d'intégration frontend |

### 3.2 Browser Testing (Built-in Lovable)

| Aspect | Détail |
|--------|--------|
| **Maturité** | 🟢 Stable |
| **Statut** | Disponible, non systématisé |
| **Description** | L'IA Lovable peut piloter un navigateur headless pour tester les flux utilisateur : navigation, clics, formulaires, captures d'écran, inspection réseau et console |
| **Utilité** | ⭐⭐⭐⭐ — Tests E2E sans setup Playwright/Cypress |

### 3.3 Edge Function Testing (Built-in)

| Aspect | Détail |
|--------|--------|
| **Maturité** | 🟢 Stable |
| **Statut** | Disponible |
| **Description** | Tests Deno intégrés pour les Edge Functions. Fichiers `*_test.ts` ou `*.test.ts` dans les dossiers de fonctions. Exécution via le runner Deno avec `--allow-net --allow-env` |
| **Utilité** | ⭐⭐⭐⭐⭐ — Validation backend avant déploiement |

### 3.4 Test & Live Environments

| Aspect | Détail |
|--------|--------|
| **Maturité** | 🟡 Beta |
| **Description** | Deux environnements séparés : **Test** (développement) et **Live** (production). Les écritures DB n'affectent que Test. La publication déploie le code et le schéma de Test vers Live. Les données ne sont jamais synchronisées entre les deux |
| **Utilité** | ⭐⭐⭐⭐⭐ — Critique pour éviter de casser la production |

---

## 4. Base de Données & Backup

### 4.1 Export CSV (Built-in)

| Aspect | Détail |
|--------|--------|
| **Maturité** | 🟢 Stable |
| **Description** | Export table par table au format CSV depuis l'interface Cloud (Database → Tables → Export) |
| **Limitation** | Manuel, table par table, pas de backup automatisé complet |
| **Utilité** | ⭐⭐⭐ — Backup manuel d'urgence |

### 4.2 pg_dump via GitHub + Cron (DIY)

| Aspect | Détail |
|--------|--------|
| **Maturité** | 🟢 Stable (approche standard PostgreSQL) |
| **Statut** | Non implémenté |
| **Description** | Créer une GitHub Action ou Edge Function cron qui exécute un dump logique des tables critiques et stocke le résultat dans un bucket Storage |
| **Utilité** | ⭐⭐⭐⭐ — Recommandé pour backup automatisé |

### 4.3 Database Linter (Built-in)

| Aspect | Détail |
|--------|--------|
| **Maturité** | 🟢 Stable |
| **Description** | Analyse automatisée de la configuration de sécurité : détection des tables sans RLS, policies trop permissives, colonnes sensibles exposées |
| **Utilité** | ⭐⭐⭐⭐⭐ — Audit de sécurité automatique |

### 4.4 Security Scan (Built-in)

| Aspect | Détail |
|--------|--------|
| **Maturité** | 🟢 Stable |
| **Description** | Scan de sécurité complet du backend : données exposées, RLS manquantes, misconfigurations. Génère des findings avec niveaux de sévérité |
| **Utilité** | ⭐⭐⭐⭐⭐ — Indispensable avant mise en production |

---

## 5. Connecteurs & Intégrations (Shared Connectors)

Lovable propose des **connecteurs partagés** qui s'activent en un clic sans gérer les clés API manuellement.

### 5.1 Lovable AI (déjà disponible ✅)

| Aspect | Détail |
|--------|--------|
| **Maturité** | 🟢 Stable |
| **Modèles** | GPT-5, GPT-5-mini, GPT-5-nano, GPT-5.2, Gemini 2.5/3 (Pro/Flash/Lite) |
| **Utilité** | ⭐⭐⭐⭐⭐ — IA intégrée sans clé API requise |

### 5.2 Stripe

| Aspect | Détail |
|--------|--------|
| **Maturité** | 🟢 Stable |
| **Statut projet** | Utilisé via Edge Functions (Stripe déjà intégré) |
| **Description** | Connecteur natif pour gestion des paiements, abonnements, factures |

### 5.3 ElevenLabs

| Aspect | Détail |
|--------|--------|
| **Maturité** | 🟢 Stable |
| **Statut** | Non installé |
| **Description** | Text-to-Speech et génération vocale. Permet de créer des apps avec sortie audio (assistants vocaux, narration, accessibilité) |
| **Utilité** | ⭐⭐ — Niche, utile pour interfaces vocales |

### 5.4 Firecrawl

| Aspect | Détail |
|--------|--------|
| **Maturité** | 🟢 Stable |
| **Statut** | Non installé |
| **Description** | Web scraping et extraction de données structurées depuis n'importe quel site web. Utile pour alimenter des dashboards avec des données externes |
| **Utilité** | ⭐⭐⭐ — Scraping web sans headless browser |

### 5.5 Perplexity

| Aspect | Détail |
|--------|--------|
| **Maturité** | 🟢 Stable |
| **Statut** | Non installé |
| **Description** | Recherche web augmentée par IA. Permet d'intégrer des réponses contextuelles avec sources dans l'application |
| **Utilité** | ⭐⭐⭐ — Recherche intelligente avec citations |

### 5.6 Shopify

| Aspect | Détail |
|--------|--------|
| **Maturité** | 🟢 Stable |
| **Statut** | Non installé |
| **Description** | Connecteur e-commerce : créer ou connecter un store Shopify, synchroniser produits et commandes |
| **Utilité** | ⭐⭐ — Uniquement si besoin e-commerce |

### 5.7 Google Auth

| Aspect | Détail |
|--------|--------|
| **Maturité** | 🟢 Stable |
| **Statut** | Non installé |
| **Description** | Sign In with Google en un clic. Configuration managée par Lovable Cloud |
| **Utilité** | ⭐⭐⭐⭐ — Simplifie l'onboarding utilisateur |

### 5.8 Apple Auth

| Aspect | Détail |
|--------|--------|
| **Maturité** | 🟢 Stable |
| **Statut** | Non installé |
| **Description** | Sign In with Apple, managé par Lovable Cloud |
| **Utilité** | ⭐⭐⭐ — Important pour utilisateurs iOS |

---

## 6. Fonctionnalités Labs (Expérimentales)

| Feature | Maturité | Description |
|---------|----------|-------------|
| **Branch Switching** | 🔴 Expérimental | Travailler sur des branches Git autres que main |
| **Plan Mode** | 🟢 Stable | L'IA planifie avant de coder, réduit les erreurs |
| **Visual Edits** | 🟢 Stable | Édition directe d'éléments statiques (texte, couleurs, polices) sans prompt |
| **Design Templates** | 🟢 Stable | Templates de design prédéfinis pour démarrer rapidement |
| **Custom Knowledge** | 🟢 Stable | Instructions persistantes injectées dans la mémoire projet |

---

## 7. Recommandations pour Lavcom Performances

### Priorité Haute (à activer rapidement)

| Outil | Raison |
|-------|--------|
| **Test & Live Environments** | Séparation dev/prod critique avant mise en production |
| **Security Scan** | Audit RLS et sécurité avant lancement |
| **Edge Function Tests** | Valider les 60+ fonctions backend automatiquement |
| **Google Auth** | Simplifier le login pour les clients |

### Priorité Moyenne (à planifier)

| Outil | Raison |
|-------|--------|
| **Branch Switching** | Développement parallèle sans risque sur main |
| **Backup automatisé** | Cron + Storage pour sauvegardes régulières |
| **Database Linter** | Vérification continue de la sécurité DB |

### Priorité Basse (nice-to-have)

| Outil | Raison |
|-------|--------|
| **Firecrawl** | Si besoin de données concurrentielles web |
| **ElevenLabs** | Si interface vocale souhaitée |
| **Perplexity** | Si recherche intelligente dans l'app |

---

## 8. Matrice de Compatibilité

```
┌─────────────────────┐
│   GitHub (Source)    │◄──── Sync bidirectionnelle
│   + Actions CI/CD   │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐     ┌──────────────────┐
│   Lovable Editor    │────►│  Lovable Cloud   │
│   (Frontend Dev)    │     │  (Backend)       │
│                     │     │  ├─ PostgreSQL    │
│  ├─ Visual Edits    │     │  ├─ Edge Funcs   │
│  ├─ Browser Test    │     │  ├─ Auth          │
│  ├─ Plan Mode       │     │  ├─ Storage       │
│  └─ Custom Knowledge│     │  └─ Realtime      │
└────────┬────────────┘     └────────┬─────────┘
         │                           │
         ▼                           ▼
┌─────────────────────┐     ┌──────────────────┐
│   Publish           │     │  Connectors      │
│   ├─ lovable.app    │     │  ├─ Stripe       │
│   └─ Custom Domain  │     │  ├─ Google Auth   │
└─────────────────────┘     │  ├─ Lovable AI    │
                            │  ├─ ElevenLabs    │
                            │  ├─ Firecrawl     │
                            │  ├─ Perplexity    │
                            │  └─ Shopify       │
                            └──────────────────┘
```

---

*Document généré le 2026-02-11 — Projet Lavcom Performances*
*Pour import ChatGPT : copier le contenu brut de ce fichier.*
