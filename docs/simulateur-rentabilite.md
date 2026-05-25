# Simulateur de Rentabilité — Documentation

> Dernière mise à jour : 2026-05-25
> Périmètre : module « Futurs exploitants » de Lavcom Performances (laveries automatiques).

---

## 1. Objet du simulateur

Le **Simulateur de Rentabilité** est un outil d'aide à la décision destiné aux **futurs exploitants** (création ou reprise de laverie automatique), ainsi qu'aux **banquiers, comptables et apporteurs d'affaires** qui doivent évaluer un projet.

Il répond à trois questions concrètes :

1. **Mon projet est-il viable ?** — Calcul du chiffre d'affaires mensuel attendu en fonction du local, du parc machines, des prix et de la fréquentation estimée.
2. **À partir de quand suis-je rentable ?** — Calcul automatique du **seuil de rentabilité** (CA mensuel, cycles/mois, cycles/jour).
3. **Quel résultat puis-je espérer ?** — Estimation du **résultat mensuel** (CA – charges variables – charges fixes), prête à être intégrée dans un business plan ou un dossier bancaire.

Le simulateur n'est **pas** un outil d'exploitation : il ne consomme aucune donnée de transactions réelles. Il sert uniquement à **projeter** un scénario avant l'ouverture d'une laverie.

Deux portes d'entrée existent :

| URL | Public | Authentification | Usage |
|---|---|---|---|
| `/simulateur` | Public (anonyme) | Non | Version **gratuite** (qualification + estimation rapide), avec capture email |
| `/simulation` | SaaS abonné | Oui | Version **complète** intégrée à la plateforme, multi-projets, exports PDF |

> ℹ️ Une troisième URL `/projections` (Business Plan SaaS) existe pour la version avancée multi-scénarios destinée aux exploitants déjà clients.

---

## 2. Packs payants

Les packs **simulateur** sont des accès **temporaires à durée limitée** (pas d'abonnement récurrent). Source de vérité : `src/config/pricingConfig.ts` (`SIMULATOR_PACKS`) et `src/config/stripeConfig.ts` (mapping Stripe).

### 2.1 Packs principaux

| Pack | Prix TTC | Durée d'accès | Projets inclus | Appels expert | Cible |
|---|---|---|---|---|---|
| **Essential** | **79 €** | 30 jours | 1 projet | — | Test rapide d'un seul emplacement |
| **Projet** ⭐ *(recommandé)* | **149 €** | 90 jours | 3 projets | — | Création/reprise avec quelques scénarios |
| **Comparateur** | **229 €** | 180 jours | 10 projets | — | Investisseurs comparant plusieurs sites |
| **Premium** | **279 €** | 90 jours | 3 projets | **2 appels** | Accompagnement personnalisé Lavcom |

Chaque pack donne accès à l'intégralité du simulateur (4 étapes + résultats), aux exports **PDF qualité bancaire** et à l'enregistrement des projets pendant la durée d'accès.

### 2.2 Add-ons (options ponctuelles)

Disponibles depuis l'application une fois un pack acheté. Source : `ADDON_PRICING` dans `pricingConfig.ts`.

| Add-on | Essential | Projet | Comparateur |
|---|---|---|---|
| **Extension +30 jours** d'accès | 39 € | 59 € | 79 € |
| **+1 projet** supplémentaire | 29 € | 39 € | *inclus (10 projets)* |

> 💡 Logique métier : l'extension applique un `GREATEST(access_expires_at, now()) + 30j` (jamais de régression de date). Voir `mem://features/simulator-add-ons-system`.

### 2.3 Bypass commercial (accès gratuit)

Une **allowlist d'emails** bénéficie d'un accès gratuit sans passage par Stripe. Vérifié **côté serveur** dans `supabase/functions/create-simulator-checkout/index.ts` (`BYPASS_EMAILS`) **et** côté client dans `src/hooks/useSimulatorAccess.ts` (`SIMULATOR_BYPASS_EMAILS`).

Emails actuellement allowlistés :
- `yohana@lavcom.fr`
- `contact@lavcom.fr`
- `yoann.misericordia@laposte.net`
- `illies.kaleche@hotmail.fr`
- `rnaranjoromero@gmail.com`

Pour un utilisateur bypass, le checkout met à jour directement son profil (`access_expires_at`, `max_projects`, `plan_code`) et renvoie une `bypassUrl` au lieu d'une session Stripe.

### 2.4 Tarifs SaaS exploitants (rappel — hors simulateur)

À ne pas confondre avec les packs simulateur. Voir `COMMERCIAL_PLANS` :

- **Starter** (1–2 laveries) : 29 €/laverie/mois
- **Multi-sites** (3–5 laveries : 25 € · 6+ : 21 €)
- **Projet/Simulation** (cf. packs ci-dessus)

Engagement annuel : **10 mois payés, 2 offerts** (~17 % d'économie).

---

## 3. Construction du simulateur

### 3.1 Parcours utilisateur (5 étapes)

Définies dans `src/pages/SimulationPage.tsx` et orchestrées par `SimulationStepper.tsx`.

| # | Étape | Composant | Données collectées |
|---|---|---|---|
| 0 | **Local** | `StepLocal.tsx` | Surface (m²), forme, obstacles structurels, largeur de porte, façade modifiable, contraintes techniques |
| 1 | **Mon projet** | `StepProjectInfo.tsx` | Nom, adresse (autofill `api-adresse.data.gouv.fr`), ville, code postal, zone, horaires |
| 2 | **Machines** | `StepMachines.tsx` | Parc de lavage/séchage : capacité kg, nombre, prix par cycle, cycles/jour estimés |
| 3 | **Charges** | `StepCosts.tsx` | Charges fixes (loyer, leasing, assurance, CFE…) + charges variables en % du CA (électricité, eau, gaz, lessive) |
| 4 | **Résultats** | `StepResults.tsx` | Synthèse + indicateurs ICI + export PDF (selon pack) |

### 3.2 Modèle de données

Source : `src/types/simulation.ts` (interface `SimulationProject`).

```ts
SimulationProject {
  name, location, country, address, city, postal_code, zone_type
  surface_m2, opening_hours_description
  local_shape, has_structural_obstacles, door_width_cm,
  can_modify_facade, technical_constraints_level
  machines: MachineConfig[]      // { type, capacity_kg, count, price, cycles_day }
  fixed_costs: FixedCostItem[]   // { label, amount, category }
  variable_costs: VariableCostItem[]  // { label, percent, category }
}
```

Valeurs par défaut pré-remplies (config standard petite laverie ~40 m²) :
- 2× lave-linge 7 kg @ 5,50 €, 2× 10 kg @ 7 €, 1× 18 kg @ 10 €
- 2× sèche-linge 14 kg @ 2 €, 1× 18 kg @ 3 €
- Loyer 1 200 €, leasing 800 €, assurance 120 €, CFE 80 €, ménage 250 €
- Électricité 10 %, eau 4 %, lessive 4 % du CA

### 3.3 Moteur de calcul

Fonction unique `calculateSimulationResults(project)` (pure, déterministe, sans I/O). Base : **30 jours/mois**.

**Recettes (par machine) :**
```
turnover_month = count × cycles_day × price × 30
```

**Agrégats :**
```
project_turnover_month   = Σ recettes lavage + Σ recettes séchage
total_cycles_month       = Σ (count × cycles_day × 30)
avg_revenue_per_cycle    = project_turnover_month / total_cycles_month
```

**Charges :**
```
fixed_costs_total    = Σ fixed_costs.amount
var_total_percent    = Σ variable_costs.percent
variable_costs_total = project_turnover_month × var_total_percent / 100
```

**Seuil de rentabilité** (formule du point mort) :
```
break_even_revenue_monthly = fixed_costs_total / (1 − var_total_percent / 100)
break_even_cycles_month    = break_even_revenue_monthly / avg_revenue_per_cycle
break_even_cycles_day      = break_even_cycles_month / 30
```
Renvoie `null` si `var_total_percent ≥ 100` (modèle non viable).

**Résultat estimé :**
```
estimated_profit_month = project_turnover_month − variable_costs_total − fixed_costs_total
```

### 3.4 Estimation de capacité du local

Fonction `calculateMaxMachinesEstimate` :
```
usable_area      = surface_m2 × 0.7
base_capacity    = usable_area / 3.5     // ~3,5 m² par machine
max_machines     = floor(base_capacity × shape_factor × obstacle_factor)
```
- `shape_factor` : 1.0 (rectangulaire) · 0.85 (long/étroit) · 0.8 (L/angle vitrines)
- `obstacle_factor` : 1.0 (aucun) · 0.9 (quelques) · 0.8 (nombreux)

Permet d'alerter l'utilisateur si son parc déclaré dépasse la capacité physique réaliste.

### 3.5 Architecture technique

**Frontend (React/Vite/TS) :**
- Pages : `SimulateurPage.tsx` (gratuit), `SimulationPage.tsx` (SaaS), `SubscribeSimulator.tsx`, `SimulatorPaymentSuccess.tsx`
- Composants étapes : `src/components/simulation/Step*.tsx`
- Capture email : `FreeEmailCaptureModal.tsx` (public) · `EmailCaptureModal.tsx` (SaaS) — avec **consentement RGPD explicite** et liens politique de confidentialité/CGV
- Paywall : `SimulatorPaywall.tsx` · `SimulatorAddonsSection.tsx` · `SimulatorAddonBanner.tsx`
- Hooks : `useSimulatorAccess`, `useSimulatorCheckout`, `useSimulatorAddons`
- Indicateurs ICI (Ambition vs Capital) : `IciIndicators.tsx`

**Backend (Lovable Cloud — Edge Functions) :**
- `create-simulator-lead` — Capture email + rate limiting (table `simulator_lead_rate_limits`) + captcha. Renvoie une erreur explicite en cas d'échec d'insertion (jamais `success:true` silencieux).
- `create-simulator-checkout` — Crée la session Stripe **ou** applique le bypass selon l'email authentifié.
- `stripe-webhook` — Active l'accès après paiement (met à jour `access_expires_at`, `max_projects`, `plan_code` sur `profiles`).
- `send-simulator-summary` — Envoie le récapitulatif par email (Resend).

**Stripe :** mapping `SIMULATOR_STRIPE_PRICES` dans `src/config/stripeConfig.ts`. Le checkout invité (sans compte) est supporté via `corsHeaders` (voir `mem://payment/guest-checkout-support`).

**Analytics :** événements GTM trackés à chaque étape (`trackSimulationStep`), à la capture email (`trackEmailSubmitted`) et au téléchargement du PDF. Voir `mem://marketing/analytics-tracking-infrastructure`.

### 3.6 Règles métier & garde-fous

- **Aucun KPI opérationnel** dans le simulateur (pas de données réelles de transactions).
- **Multi-projets** : limité par `max_projects` du pack en cours, isolé par `auth.uid()` + `owns_site()`.
- **Expiration** : au-delà de `access_expires_at`, les projets restent **lisibles** mais non modifiables (proposition d'extension/rachat).
- **Soft delete uniquement** (`deleted_at`).
- **Devise** : tous les montants en **EUR TTC** côté UI ; conversion HT pour les exports PDF financiers (voir `mem://features/financial-projections-suite`).
- **Sécurité exports CSV** : préfixe `'` pour les cellules débutant par `=`, `+`, `-`, `@` (anti-injection formules).

---

## 4. Références fichiers

```
src/
├── config/
│   ├── pricingConfig.ts        # SIMULATOR_PACKS, ADDON_PRICING
│   ├── stripeConfig.ts         # mapping price_id Stripe
│   └── commercialPlans.ts      # COMMERCIAL_PLANS (SaaS + project)
├── types/simulation.ts         # modèle + moteur de calcul
├── pages/
│   ├── SimulateurPage.tsx      # version publique gratuite
│   ├── SimulationPage.tsx      # version SaaS intégrée
│   ├── SubscribeSimulator.tsx  # choix de pack
│   └── SimulatorPaymentSuccess.tsx
├── components/simulation/      # étapes, paywall, add-ons, ICI
├── components/free-simulator/  # modale capture email publique
└── hooks/
    ├── useSimulatorAccess.ts   # bypass + état d'accès
    ├── useSimulatorCheckout.ts # Stripe + bypass redirect
    └── useSimulatorAddons.ts

supabase/functions/
├── create-simulator-lead/
├── create-simulator-checkout/
├── stripe-webhook/
└── send-simulator-summary/
```

---

## 5. Évolutions récentes notables

- **Rate limiting + captcha** sur `create-simulator-lead` (anti-spam leads).
- **Consentement RGPD explicite** dans les modales de capture email avant tout tracking.
- **Bypass serveur** étendu à `contact@lavcom.fr` + 4 emails partenaires.
- **Gestion d'erreurs stricte** : `create-simulator-lead` renvoie 500 + message explicite au lieu de `success:true` silencieux.
