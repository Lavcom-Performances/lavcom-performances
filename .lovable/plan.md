## Objectif

Câbler l'ensemble des composants du simulateur payant (`src/components/simulator/**`) sur le hook `useSimulationProject` défini dans `src/hooks/useSimulatorProject.ts` afin de persister l'état du projet dans le `localStorage` à chaque modification, et compléter les valeurs par défaut du hook.

## Modifications à apporter au hook `src/hooks/useSimulatorProject.ts`

Le hook fonctionne, mais deux points sont à adapter :

1. **Nom du hook exporté** : il s'appelle actuellement `useSimulationProject`, identique à celui utilisé par le module SaaS (`src/hooks/useSimulationProject.ts`). Cela crée une ambiguïté forte (imports mixés, risque de bug). Le renommer en `**useSimulatorProject**` pour matcher le nom du fichier, et réserver `useSimulationProject` au module SaaS existant.

## Intégration dans les composants du simulateur

### Principe

- Un unique appel à `useSimulatorProject()` par page (`SimulatorProjectPage`, `SimulatorMachinesPage`, `SimulatorChargesPage`, `SimulatorResultsPage`).
- La page passe `project` et `updateProject` en props aux sous-composants (pattern déjà en place dans le module `simulation/`).
- Le `localStorage` est mis à jour automatiquement par le `useEffect` du hook.

### Étape 1 — Projet & localisation (`SimulatorProjectPage`)

- `ProjectTabs`, `ProjectInfoForm`, `LocalConstraintsForm` reçoivent `project` + `onUpdate`.
- `**ProjectIdentityCard**` : `projectName` et `scenarioName` — remplacer `defaultValue` par `value` + `onChange` -> `updateProject`.
- `**LocationCard**` : supprimer l'état local `ProjectLocationState` de `ProjectInfoForm` ; brancher directement sur `project.country`, `project.address`, `project.city`, `project.postalCode`, `project.departmentCode`, `project.departmentName`, `project.region` via `updateProject`.
- `**OpeningHoursCard**` : conserver l'état local pour l'UI (preset + custom time/days), mais écrire dans `project.openingHours` et `project.openingDays` à chaque changement. Les valeurs stockées correspondent aux options de `OPENING_HOURS_OPTIONS` / `OPENING_DAYS_OPTIONS` (incluant `custom` + valeurs personnalisées).
- `**SurfaceCard**` : remplacer `useState("")` par `project.surface` / `updateProject({ surface: ... })`.
- `**LocalConstraintsForm**` : brancher les `RadioCard` (`localShape`, `structuralObstacles`, `technicalConstraints`, `canModifyFacade`) et l'input `doorWidth` sur `project` + `updateProject`. Ceci nécessite d'ajouter des props `value` / `onValueChange` à `RadioCard` (actuellement uniquement `defaultValue`).

### Étape 2 — Machines (`SimulatorMachinesPage`)

- `**WashersConfigCard` / `DryersConfigCard**` : remplacer `MOCK_WASHERS` / `MOCK_DRYERS` par `project.machines.filter(m => m.type === 'washer' | 'dryer')`.
- `**MachineCounter**` : ajouter props `onCountChange`, `onPriceChange`, `onCyclesChange` qui appellent `updateProject({ machines: ... })` (mise à jour immuable d'un item).
- Bouton "Ajouter" -> ajoute une entrée à `project.machines` avec un `id` unique (`crypto.randomUUID()`).
- `**MachineMixSummary**` : dérive ses totaux depuis `project.machines` (au lieu de mock).

### Étape 3 — Charges (`SimulatorChargesPage`)

- `**FixedCostsCard**` : itère sur `project.fixedCosts` ; `CostRow` reçoit `value` + `onChange` ; suppression = filtre sur `id` ; ajout = append.
- `**VariableCostsCard**` : idem avec `project.variableCosts` et `percent`.
- `**ChargesTotalsBanner**` : totaux dérivés de `project.fixedCosts` / `project.variableCosts`.

### Étape 4 — Résultats (`SimulatorResultsPage`)

- Passe `project` aux composants existants (`ResultsHeroKpis`, `ResultsSummaryCard`, etc.).
- Pas de calculs pour le moment.

## Détails techniques

- **Aucun changement fonctionnel** sur le module SaaS `src/pages/simulation/**` ni sur `src/hooks/useSimulationProject.ts` (mandat "additive only").
- **Clé de stockage** : reste `"simulationProject"` (déjà défini dans le hook).
- `**MOCK_***` dans `src/components/simulator/mockData.ts` : conservés uniquement pour le calcul de démo (CA affiché) tant que les résultats ne sont pas branchés, puis remplacés à l'étape 4.
- **Champs typés `Partial<OpeningHoursOption>` / `Partial<OpeningDaysOption>**` : je stockerai la clé `value` + les champs personnalisés (`openAt`/`closeAt` ou `days`) pour rester compatible avec le type existant.

## Ordre d'implémentation

1. Adapter le hook (renommage + defaults complets).
2. Câbler la page Projet (étape la plus riche).
3. Câbler Machines.
4. Câbler Charges.
5. Câbler Résultats + calcul.
6. Vérifier persistance localStorage via Playwright (recharger la page, valeurs conservées).

## Question ouverte

Souhaites-tu que je renomme la clé `localStorage` en `"lavcom_simulator_project"` pour la distinguer clairement de celle du module SaaS (`"lavcom_simulation_project"`) ? Sinon je garde `"simulationProject"` telle qu'elle est dans le hook actuel.

Réponse : garder `"simulationProject"`