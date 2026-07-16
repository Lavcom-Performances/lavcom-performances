## Objectif

Refactoriser `useSimulatorValidation` avec des schémas Zod couvrant l'ensemble des champs saisis dans `src/components/simulator/`, et supprimer le type `SimulatorProjectFormProps` (non utilisé après la migration vers le contexte).

## 1. Suppression du type inutilisé

`src/types/simulator.types.ts` : supprimer `SimulatorProjectFormProps` (aucun consommateur — vérifié par recherche globale).

## 2. Nouveau fichier `src/lib/validation/simulatorProjectSchema.ts`

Regrouper la logique Zod dans un fichier dédié pour la garder lisible et réutilisable (par ex. futures étapes de submit). Un schéma par section, plus un schéma global.

### Schémas par section

**`projectInfoSchema`** (onglet Projet — `ProjectIdentityCard`, `LocationCard`, `OpeningHoursCard`)
- `projectName` : `string().trim().min(3, "Le nom du projet est requis (min. 3 caractères)").max(100)`
- `scenarioName` : `string().trim().min(1, "Le nom du scénario est requis").max(100)`
- `country` : `string().min(1, "Le pays est requis")`
- `address` : `string().trim().min(1, "L'adresse est requise").max(200)`
- `city` : `string().trim().min(1, "La ville est requise")`
- `postalCode` : `string().trim().min(1, "Le code postal est requis")`
- `zoneType` : `enum([...ZONE_TYPES.map(z => z.value)], { message: "Le type de zone est requis" })`
- `openingHours` : objet `{ value: enum(OPENING_HOURS_OPTIONS.value), openAt: string(regex HH:MM), closeAt: string(regex HH:MM) }` + `.refine` pour `value === "custom"` → `closeAt !== openAt` (message "Les horaires personnalisés sont invalides")
- `openingDays` : objet `{ value: enum(OPENING_DAYS_OPTIONS.value), days: array(WeekDay).min(1, "Sélectionnez au moins un jour") }`

**`localConstraintsSchema`** (onglet Projet — `SurfaceCard`, `LocalConstraintsForm`)
- `surface` : `number({ message: "La surface est requise" }).min(10, "Surface minimum 10 m²").max(500, "Surface maximum 500 m²")`
- `localShape`, `structuralObstacles`, `canModifyFacade`, `technicalConstraints` : `enum` construit à partir des options correspondantes (valeur `"unknown"` autorisée puisqu'elle fait partie des choix — seule l'absence de valeur déclenche une erreur)
- `doorWidth` : `number().min(60, "Largeur de porte minimum 60 cm").max(300)`

**`machinesSchema`** (onglet Machines — `WashersConfigCard`, `DryersConfigCard`)
- `machines` : `array(machineConfigSchema).min(1, "Ajoutez au moins une machine")`
  - avec `.refine` : au moins une machine dont `count > 0` ("Configurez au moins une machine active")
- `machineConfigSchema` : `{ id: string, type: enum(['washer','dryer']), capacity_kg: number.min(1), count: number.int().min(0), price: number.min(0), cycles_day: number.min(0) }`

**`chargesSchema`** (onglet Charges — `FixedCostsCard`, `VariableCostsCard`)
- `fixedCosts` : `array({ id, label: string.trim().min(1, "Libellé requis"), amount: number.min(0, "Montant invalide"), category: enum([...]) })`
- `variableCosts` : `array({ id, label: string.trim().min(1), percent: number.min(0).max(100, "0–100 %"), category: enum([...]) })`
- `.refine` global : somme des `percent` ≤ 100 ("Total des charges variables > 100 %")

### Schéma global

`simulatorProjectSchema = projectInfoSchema.merge(localConstraintsSchema).merge(machinesSchema).merge(chargesSchema)`

Export d'un type inféré : `export type SimulatorProjectInput = z.infer<typeof simulatorProjectSchema>`.

## 3. Refactor de `src/hooks/useSimulatorValidation.ts`

- Renommer l'export en `useSimulatorValidation` (aujourd'hui incohérent : le fichier s'appelle `useSimulatorValidation.ts` mais exporte `useSimulationValidation`).
- Consommer `useSimulatorProjectContext()` directement — plus besoin de passer `project` en argument, puisque tous les composants sont dans le Provider. Signature :
  ```ts
  useSimulatorValidation(): ValidationResult
  ```
- Types :
  ```ts
  type ValidationErrors = Partial<Record<keyof SimulatorProjectInput, string>>;
  type SectionKey = 'projectInfo' | 'localConstraints' | 'machines' | 'charges';
  interface ValidationResult {
    isValid: boolean;
    errors: ValidationErrors;         // { field: firstMessage }
    errorCount: number;
    sections: Record<SectionKey, { isValid: boolean; errorCount: number }>; // pour badges par onglet
  }
  ```
- Implémentation : `useMemo` → `simulatorProjectSchema.safeParse(project)`, aplatir via `error.flatten().fieldErrors` (premier message par champ). Calculer `sections` en re-parsant chaque sous-schéma sur `project` (léger, tout est mémoïsé).
- Supprimer les `console.log('[DEBUG] …')`.

## 4. Vérifications

- `bunx tsgo --noEmit` doit rester vert.
- Aucun composant ne consomme aujourd'hui `useSimulationValidation` (grep) — le renommage est safe. Si le grep révèle un consommateur, adapter l'import dans le même passage.

## Fichiers touchés

- ✏️ `src/types/simulator.types.ts` — retire `SimulatorProjectFormProps`
- 🆕 `src/lib/validation/simulatorProjectSchema.ts` — schémas Zod
- ✏️ `src/hooks/useSimulatorValidation.ts` — refactor complet, consomme le contexte

## Détails techniques

- Zod est déjà présent dans le projet (utilisé ailleurs pour la validation formulaires) — pas d'ajout de dépendance.
- Les enums Zod sont construits dynamiquement à partir des constantes de `src/config/simulatorFormOptions.ts` pour rester la source unique de vérité (pas de duplication des valeurs).
- `safeParse` seulement, jamais `parse` — la validation est utilisée pour afficher des erreurs, pas pour interrompre l'exécution.
- Le hook reste pur : pas d'effet de bord, pas d'appel réseau, `useMemo` sur `project`.