## Objectif

Remplacer le "props drilling" (`project`/`onUpdate` passés de page → tabs → forms → cards) par un `SimulatorProjectContext` unique qui expose l'état du hook `useSimulatorProject`, tout en préservant les refactorisations réalisées dans `src/components/simulator/` (fichiers `types.ts` par domaine, helpers `updateMachineList`, `addFixedCost`, etc.).

## Portée

Ajout d'un provider monté au niveau `SimulatorLayout` (une seule instance partagée entre les 3 pages du simulateur payant : Projet, Machines, Charges). Les composants consomment le contexte via un hook dédié. Aucune modification de la logique métier ni des helpers dans les `types.ts` de domaine.

## Fichiers créés

**`src/contexts/SimulatorProjectContext.tsx`**
- `SimulatorProjectContext` (React Context) typé sur la valeur de retour de `useSimulatorProject`.
- `SimulatorProjectProvider` : instancie `useSimulatorProject()` une seule fois et fournit `{ project, updateProject, resetProject, clearStorage, setProject, isLoaded }`.
- `useSimulatorProjectContext()` : hook consommateur qui `throw` si utilisé hors provider (garde-fou).
- Optionnel : sélecteurs pratiques exportés (`useSimulatorProjectValue()`, `useSimulatorProjectUpdate()`) — retenu si tu veux limiter les re-rendus, sinon on garde un seul hook.

## Fichiers modifiés

1. **`src/components/layout/SimulatorLayout.tsx`**  
   Envelopper `<Outlet />` avec `<SimulatorProjectProvider>` pour que les 3 pages partagent le même état (utile si l'utilisateur navigue entre les onglets sans recharger la page).

2. **Pages** — suppression de l'appel local à `useSimulatorProject` et des props passées aux composants :
   - `src/pages/simulator/SimulatorProjectPage.tsx` → `<ProjectTabs />` sans props
   - `src/pages/simulator/SimulatorMachinesPage.tsx` → `<WashersConfigCard />`, `<DryersConfigCard />`, `<MachineMixSummary />` sans props
   - `src/pages/simulator/SimulatorChargesPage.tsx` → `<FixedCostsCard />`, `<VariableCostsCard />` sans props

3. **Composants simulator** — chaque composant consomme `useSimulatorProjectContext()` au lieu de recevoir `project` / `onUpdate` en props. Les signatures deviennent `export function X()` sans props liées au projet (les props purement UI comme `children` sont conservées).
   - `project/ProjectTabs.tsx`
   - `project/ProjectInfoForm.tsx`
   - `project/LocalConstraintsForm.tsx`
   - `project/ProjectDetailsCard.tsx`
   - `project/ProjectIdentityCard.tsx`
   - `project/LocationCard.tsx`
   - `project/OpeningHoursCard.tsx`
   - `project/SurfaceCard.tsx`
   - `machines/WashersConfigCard.tsx`
   - `machines/DryersConfigCard.tsx`
   - `machines/MachineMixSummary.tsx`
   - `charges/FixedCostsCard.tsx`
   - `charges/VariableCostsCard.tsx`

## Ce qu'on NE touche PAS

- Les helpers purs (`updateMachineList`, `addFixedCost`, `removeVariableCost`, `machineMonthlyRevenue`, …) dans `charges/types.ts`, `machines/types.ts`, `project/types.ts` — ils restent utilisés tels quels dans les cards.
- Les composants de présentation "feuilles" (`CostRow`, `MachineCounter`, `RadioCard`, `FormField`, `AddressAutocomplete`, `TabSectionHeading`, `PricingHintBanner`, `ChargesTotalsBanner`) — ils gardent leurs props locales `value`/`onChange` car ils sont réutilisables et n'ont pas à connaître le projet.
- Le hook `useSimulatorProject` lui-même (aucune modification).
- Le type `SimulatorProjectFormProps` dans `src/types/simulator.types.ts` — laissé en place le temps de la migration, à supprimer une fois tous les consommateurs migrés (dernier commit du chantier).

## Points techniques

- Le provider est monté dans `SimulatorLayout`, pas dans `App.tsx`, pour garder l'état isolé au sous-arbre `/simulator/*` et permettre un `resetProject` en quittant le layout si souhaité plus tard.
- Les pages de l'ancien parcours `/simulation/*` (SaaS intégré) restent sur `useSimulationProject` — aucun changement là-bas.
- Le hook `useSimulatorProject` doit être appelé **une seule fois** par arbre (dans le provider). Sinon chaque page instancierait son propre state avec un `isLoaded` séparé et des writes concurrents dans `localStorage`. Le montage dans `SimulatorLayout` garantit cette unicité.
- Compatible avec la future validation Zod : `useSimulatorValidation` consommera aussi le contexte au lieu de recevoir `project` en argument (à faire dans un second chantier).

## Ordre d'implémentation

1. Créer `SimulatorProjectContext.tsx` + provider + hook.
2. Wrapper `SimulatorLayout`.
3. Migrer les cards (feuilles du drilling) → puis les forms → puis les tabs → puis les pages.
4. Supprimer `SimulatorProjectFormProps` de `src/types/simulator.types.ts` et les imports orphelins.
5. Vérification build.
