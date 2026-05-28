
# Documentation technique du Simulateur payant (`/simulation`)

## Objectif
Produire un seul fichier markdown `docs/simulateur-architecture.md` qui décrit en profondeur le fonctionnement de la fonctionnalité « simulateur payant » accessible via la route `/simulation`, sans modifier le code applicatif.

## Livrable
Un fichier : `docs/simulateur-architecture.md` (téléchargeable depuis le repo).

## Plan du document

### 1. Vue d'ensemble
- Rôle du simulateur payant vs `/simulateur` (gratuit)
- Conditions d'accès (paywall via `useSimulatorAccess`, `profiles.access_expires_at`, `max_projects`, `plan_code`, bypass emails)
- Schéma global frontend ↔ localStorage ↔ Supabase ↔ Stripe

### 2. Cartographie des routes & pages
Pour chaque route (`/simulation`, `/simulation/local`, `/simulation/charges`, `/simulation/results`) :
- Fichier page concerné
- Composant `Step*` rendu
- Navigation (boutons précédent/suivant, validation)
- Layout commun (`SimulationLayout`, `SimulationStepper`)

### 3. Dictionnaire des variables (state)
Tableau exhaustif des variables du `SimulationProject` (depuis `src/types/simulation.ts`) :
- nom, type, valeur par défaut, page où elle est saisie, événement déclencheur (`onChange`, `onBlur`...), composant input, contrainte de validation (`useSimulationValidation`)
- Sous-objets : `MachineConfig[]`, `FixedCostItem[]`, `VariableCostItem[]`, contraintes locales (`local_shape`, `door_width_cm`, etc.)
- Tableau séparé pour `SimulationResults` (variables calculées)
- Variables d'accès (`SimulatorAccess` : `hasAccess`, `tier`, `daysRemaining`, `maxProjects`, `projectsUsed`)

### 4. Gestion du formulaire & persistance
- Hook `useSimulationProject` : state React + `localStorage` clé `lavcom_simulation_project`
- `updateProject(partial)` / `resetProject()` / `clearStorage()`
- Validation : `useSimulationValidation` (champs obligatoires, messages, `errorCount`)
- Cycle de vie : initialisation depuis localStorage → modifications page par page → recalcul des résultats avec `useMemo(calculateSimulationResults)`
- **Important** : aucun enregistrement automatique en BDD pendant la saisie ; tout vit côté client jusqu'à un événement explicite (email capture, paiement, export PDF)

### 5. Mapping inputs ↔ base de données
Tableau pour chaque champ du formulaire :
- input UI → propriété `SimulationProject` (localStorage) → table/colonne Supabase éventuelle (`simulator_leads`, `profiles`, `fin_projects` si export, etc.)
- Distinction claire « stocké côté client uniquement » vs « envoyé via edge function »
- Flux email capture (`EmailCaptureModal` → `create-simulator-lead`)
- Flux paiement (paywall → `create-simulator-checkout` → Stripe → `stripe-webhook` → `profiles`)

### 6. Affichage dynamique par page
Pour chaque page (Projet, Local, Charges, Résultats) :
- Liste des composants rendus
- Variables consommées et fonctions appelées (`calculateMaxMachinesEstimate`, `getTotalUserMachines`, `getShapeFactor`, `getObstacleFactor`, `calculateSimulationResults`)
- Conditions d'affichage (badges erreur, alertes, IciIndicators, paywall, addons)
- Ce qui est calculé côté front (tous les KPI de résultats, seuils de rentabilité) vs ce qui dépend du backend (droits d'accès, génération PDF si applicable, envoi email)

### 7. Schéma de base de données
- **Dictionnaire de données** : tableau par table (`profiles`, `simulator_leads`, `simulator_addon_purchases`, `paywall_bypass_allowlist`, `fin_projects` si lié, `platform_feature_flags`) avec colonnes, types, contraintes, RLS
- **Diagramme Mermaid** `erDiagram` montrant les relations entre ces tables
- Requête live `supabase--read_query` sur `information_schema` pour récupérer la définition réelle des tables liées au simulateur avant rédaction

### 8. Edge functions impliquées
Liste avec rôle, déclencheur, entrées/sorties :
- `create-simulator-checkout` : crée session Stripe pour un pack (`essential`/`project`/`comparator`/`premium`), gère bypass emails
- `create-simulator-lead` : enregistre lead email + déclenche `send-simulator-summary`
- `send-simulator-summary` : email récapitulatif au prospect
- `create-addon-checkout` : achat add-on (extension 30j, +1 projet)
- `stripe-webhook` : met à jour `profiles.access_expires_at`, `max_projects`, `plan_code`
- `stripe-reconcile-cron` : réconciliation
- `generate-financial-pdf` (si utilisée pour export résultats)
- Autres satellites (`validate-postal-code`, `fetch-from-siret`) si appelées dans les étapes

### 9. Frontend vs Backend (synthèse)
Tableau résumé : pour chaque fonctionnalité (saisie, calcul KPI, validation, persistance temporaire, paywall, paiement, email, PDF), indiquer où elle s'exécute.

### 10. Diagrammes Mermaid
- `flowchart` du parcours utilisateur `/simulation` → `/results`
- `sequenceDiagram` du flux paiement (User → Frontend → create-simulator-checkout → Stripe → stripe-webhook → profiles → useSimulatorAccess)
- `erDiagram` du modèle de données

## Méthode d'exécution (en mode build)
1. Lire en parallèle : `StepProjectInfo`, `StepLocal`, `StepMachines`, `StepCosts`, `StepResults`, `useSimulationValidation`, `useSimulatorCheckout`, `useSimulatorAddons`, `SimulatorPaywall`, `EmailCaptureModal`, `SimulationLayout`, `SimulationChargesPage`, `SimulationLocalPage`, `create-simulator-lead/index.ts`, `send-simulator-summary/index.ts`, `create-addon-checkout/index.ts`, `stripe-webhook/index.ts` (sections pertinentes).
2. Requêter le schéma BDD via `supabase--read_query` pour `profiles`, `simulator_*`, `paywall_bypass_allowlist`.
3. Rédiger `docs/simulateur-architecture.md` avec les sections ci-dessus et les 3 diagrammes Mermaid intégrés.
4. Ne créer aucun autre fichier, ne modifier aucun code applicatif.
