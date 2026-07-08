## Objectif

Extraire les **options de formulaire** (listes de choix statiques) de `src/components/simulator/mockData.ts` vers deux nouveaux fichiers dans `src/config/`, en séparant valeurs et types. Les données de mock métier (MOCK_PROJECT, MOCK_WASHERS, MOCK_REVENUE, MOCK_PACKS, etc.) restent dans `mockData.ts`.

## Périmètre : constantes déplacées

Ce sont des listes d'options pour selects/radios, non des valeurs par défaut :

- `ZONE_TYPES`
- `SURFACE_PRESETS`
- `OPENING_HOURS_PRESETS`
- `LOCAL_SHAPES`
- `STRUCTURAL_OBSTACLES`
- `FACADE_OPTIONS`
- `TECHNICAL_CONSTRAINTS`
- `FIXED_COST_CATEGORIES` (utilisé comme liste d'options catégorie coût)

Restent dans `mockData.ts` : `MOCK_PROJECT`, `MOCK_WASHERS`, `MOCK_DRYERS`, `MOCK_REVENUE`, `MOCK_FIXED_COSTS`, `MOCK_FIXED_TOTAL`, `MOCK_VARIABLE_COSTS`, `MOCK_VARIABLE_TOTAL_PERCENT`, `MOCK_BREAKEVEN`, `MOCK_PACKS`.

## Fichiers créés

### 1. `src/config/simulatorFormOptions.types.ts`

```ts
export interface SimulatorSelectOption {
  value: string;
  label: string;
}

export type ZoneTypeValue = "urbaine" | "peri-urbaine" | "rurale" | "commerciale";
export type SurfacePresetValue = "30" | "40" | "60" | "80";
export type OpeningHoursPresetValue = "7-22" | "6-23" | "24-7" | "custom";
export type LocalShapeValue = "rectangular" | "narrow" | "l-shape" | "corner";
export type StructuralObstacleValue = "none" | "few" | "many";
export type FacadeOptionValue = "yes" | "no" | "unknown";
export type TechnicalConstraintValue = "ok" | "check_with_installer" | "heavy_work";
export type FixedCostCategory =
  | "Loyer / Charges locatives"
  | "Prêt / Leasing"
  | "Assurance"
  | "Impôt / Taxe"
  | "Salaire / Charges sociales"
  | "Ménage / Entretien"
  | "Autre";

// Chaque liste d'options est typée comme readonly SimulatorSelectOption[]
// avec le `value` restreint à l'union correspondante via `satisfies`.
```

### 2. `src/config/simulatorFormOptions.ts`

Réexporte les 8 constantes ci-dessus, typées via `satisfies readonly (SimulatorSelectOption & { value: XxxValue })[]` pour conserver l'inférence stricte des `value`. `FIXED_COST_CATEGORIES` reste `readonly FixedCostCategory[]`.

## Mise à jour des imports

Remplacer `@/components/simulator/mockData` par `@/config/simulatorFormOptions` dans :

- `src/components/simulator/project/SurfaceCard.tsx` — `SURFACE_PRESETS`
- `src/components/simulator/project/LocationCard.tsx` — `ZONE_TYPES`
- `src/components/simulator/project/OpeningHoursCard.tsx` — `OPENING_HOURS_PRESETS`
- `src/components/simulator/project/LocalConstraintsForm.tsx` — `FACADE_OPTIONS`, `LOCAL_SHAPES`, `STRUCTURAL_OBSTACLES`, `TECHNICAL_CONSTRAINTS`

`FIXED_COST_CATEGORIES` n'est pas importé actuellement, aucune mise à jour supplémentaire.

Les 10 autres fichiers qui importent `MOCK_*` depuis `mockData.ts` ne sont pas touchés.

## Nettoyage

Supprimer les 8 constantes déplacées de `src/components/simulator/mockData.ts`.

## Validation

- `bunx tsgo --noEmit` doit passer
- `rg "ZONE_TYPES|SURFACE_PRESETS|OPENING_HOURS_PRESETS|LOCAL_SHAPES|STRUCTURAL_OBSTACLES|FACADE_OPTIONS|TECHNICAL_CONSTRAINTS|FIXED_COST_CATEGORIES" src` doit uniquement pointer vers `src/config/simulatorFormOptions*` et les consommateurs mis à jour
