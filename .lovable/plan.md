## Objectif

Ajouter une validation par étape au clic sur « Continuer » dans le tunnel `/simulator/*`, en s'appuyant sur `useSimulatorValidation` (Zod, sections déjà définies : `projectInfo`, `localConstraints`, `machines`, `charges`), et afficher les erreurs directement dans les champs via les primitives `Field` de shadcn.

## Comportement attendu

- **Étape 1 — `/simulator/project`** : valider **projectInfo ET localConstraints** (les deux onglets) avant de passer à `/simulator/machines`.
- **Étape 2 — `/simulator/machines`** : valider `machines`.
- **Étape 3 — `/simulator/charges`** : valider `charges`.
- **Étape 4 — `/simulator/results`** : pas de bouton suivant.
- En cas d'échec :
  - toast d'erreur (sonner) indiquant le nombre de champs à corriger,
  - pas de navigation,
  - sur la page projet, bascule automatique vers l'onglet contenant la première erreur,
  - les champs invalides passent en état d'erreur (bordure destructive + message) via `Field` shadcn.

## Changements

### 1. `SimulatorFooterNav` — devenir contrôlable
`src/components/simulator/layout/SimulatorFooterNav.tsx`

- Ajouter `onNext?: () => boolean | void` (retour `false` = bloque la navigation) et `nextDisabled?: boolean`.
- Si `onNext` est fourni : bouton `<Button onClick>` qui appelle `onNext()`, puis `navigate(nextPath)` via `useNavigate()` si le retour ≠ `false`.
- Sinon, garder le comportement `<Link>` actuel (rétrocompatible).

### 2. Hook utilitaire de garde d'étape : `useSimulatorStep`
Nouveau fichier `src/hooks/useSimulatorStep.ts`

- Signature :
  ```ts
  useSimulatorStep(
    sections: SimulatorValidationSection[],
    options?: { onInvalid?: (firstInvalid: SimulatorValidationSection) => void }
  ): {
    guardNext: () => boolean;
    attempted: boolean;              // true après un premier clic « Continuer »
    errors: ValidationErrors;        // depuis useSimulatorValidation
    sections: ValidationResult["sections"];
    fieldError: (name: keyof SimulatorProjectInput) => string | undefined;
  }
  ```
- `guardNext()` :
  - lit `useSimulatorValidation()` (déjà branché sur le contexte),
  - si toutes les sections listées sont valides → `attempted` reste inchangé, retourne `true`,
  - sinon → passe `attempted = true`, toast erreur (`toast.error("N champ(s) à corriger avant de continuer")`), appelle `onInvalid(firstInvalidSection)`, retourne `false`.
- `fieldError(name)` retourne l'erreur seulement si `attempted === true` (les erreurs n'apparaissent pas avant la première tentative), afin d'être branché directement sur `Field`.

### 3. Affichage des erreurs via `Field` shadcn
Référence : https://ui.shadcn.com/docs/components/base/field#validation-and-errors

Le composant utilitaire existant `src/components/simulator/project/FormField.tsx` (wrapper de `Field` / `FieldLabel` / `FieldDescription`) est étendu :

- Ajouter `error?: string` :
  - quand présent : ajouter `data-invalid` sur le `Field`, remplacer/compléter la `FieldDescription` par `<FieldError>{error}</FieldError>` (primitive shadcn),
  - passer `aria-invalid` et `aria-describedby` sur le contrôle (via `id` déjà géré par `htmlFor`).
- Aucun changement de signature côté champs valides (rétrocompatible).

Chaque carte de saisie du simulateur (`ProjectIdentityCard`, `LocationCard`, `OpeningHoursCard`, `SurfaceCard`, `LocalConstraintsForm`, `WashersConfigCard`, `DryersConfigCard`, `FixedCostsCard`, `VariableCostsCard`) :

- récupère `fieldError` depuis `useSimulatorStep(...)` de sa page parente via un petit contexte de page, ou plus simplement via un hook local `useSimulatorStepErrors()` qui expose uniquement `fieldError` (les cartes n'ont pas besoin de `guardNext`),
- passe `error={fieldError("projectName")}` (etc.) au `FormField` correspondant.

Pour éviter du prop drilling, ajouter un **`SimulatorStepContext`** minimal :
- `src/contexts/SimulatorStepContext.tsx` — fournit `{ fieldError }` ; alimenté par chaque page via `<SimulatorStepProvider value={{ fieldError }}>`.
- Les cartes consomment `useSimulatorStepErrors()` qui lit ce contexte (retourne un `fieldError` no-op si aucun provider — cartes réutilisables ailleurs sans casse).

### 4. Page projet — valider les 2 onglets
`src/pages/simulator/SimulatorProjectPage.tsx` + `ProjectTabs.tsx`

- Rendre `ProjectTabs` contrôlé : `value` / `onValueChange` remontés à la page.
- Page :
  ```ts
  const { guardNext, fieldError } = useSimulatorStep(
    ["projectInfo", "localConstraints"],
    { onInvalid: (s) => setActiveTab(s === "projectInfo" ? "project" : "local") }
  );
  ```
- Wrapper `<SimulatorStepProvider value={{ fieldError }}>` autour de `<ProjectTabs />`.
- `<SimulatorFooterNav nextPath="/simulator/machines" onNext={guardNext} />`.

### 5. Page machines
`src/pages/simulator/SimulatorMachinesPage.tsx`

- `const { guardNext, fieldError } = useSimulatorStep(["machines"]);`
- Wrapper `<SimulatorStepProvider value={{ fieldError }}>`.
- `<SimulatorFooterNav previousPath="/simulator/project" nextPath="/simulator/charges" onNext={guardNext} />`.

### 6. Page charges
`src/pages/simulator/SimulatorChargesPage.tsx`

- Idem avec `["charges"]` et `nextPath="/simulator/results"`.

### 7. (UX) Badges d'erreur sur les onglets
`ProjectTabs.tsx` : afficher `sections.projectInfo.errorCount` / `sections.localConstraints.errorCount` sur les triggers uniquement quand `attempted === true` (exposé aussi par `useSimulatorStep`).

## Hors périmètre

- Aucune modification de `useSimulatorValidation.ts` ni du schéma Zod.
- Aucune modification des règles métier ou du modèle.
- `/simulation` (SaaS) n'est pas touché.

## Fichiers touchés

- ✏️ `src/components/simulator/layout/SimulatorFooterNav.tsx` — support `onNext`
- 🆕 `src/hooks/useSimulatorStep.ts` — garde d'étape + accès erreurs
- 🆕 `src/contexts/SimulatorStepContext.tsx` — provider + `useSimulatorStepErrors`
- ✏️ `src/components/simulator/project/FormField.tsx` — prop `error`, `FieldError`, `data-invalid`, `aria-invalid`
- ✏️ `src/components/simulator/project/ProjectTabs.tsx` — contrôlé + badges d'erreurs
- ✏️ `src/pages/simulator/SimulatorProjectPage.tsx` — `useSimulatorStep(["projectInfo","localConstraints"])` + provider
- ✏️ `src/pages/simulator/SimulatorMachinesPage.tsx` — `useSimulatorStep(["machines"])` + provider
- ✏️ `src/pages/simulator/SimulatorChargesPage.tsx` — `useSimulatorStep(["charges"])` + provider
- ✏️ Cartes de saisie (`ProjectIdentityCard`, `LocationCard`, `OpeningHoursCard`, `SurfaceCard`, `LocalConstraintsForm`, `WashersConfigCard`, `DryersConfigCard`, `FixedCostsCard`, `VariableCostsCard`) — branchement `error={fieldError("...")}` sur chaque `FormField`.
