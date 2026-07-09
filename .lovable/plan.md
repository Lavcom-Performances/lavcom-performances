## Objectif

Résoudre le conflit `shadow-sm` (base `Card` shadcn) vs `shadow-form` en créant un composant dédié aux cartes du simulateur, sans toucher au `Card` de base.

## Cause du bug

Le `Card` shadcn applique `shadow-sm` en dur. `tailwind-merge` ne reconnaît pas la clé custom `form` dans le groupe `shadow`, donc `shadow-sm` et `shadow-form` cohabitent et `shadow-sm` gagne dans la CSS générée. Sur les inputs, pas de `shadow-sm` de base → `shadow-form` s'applique.

## Étapes

### 1. Créer `src/components/ui/form-card.tsx`

Nouveau composant `FormCard` qui wrappe la même structure que `Card` mais avec `shadow-form` en base au lieu de `shadow-sm`. Réexporte les sous-composants existants (`CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`) pour usage identique.

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

const FormCard = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("rounded-lg border bg-card text-card-foreground shadow-form", className)}
      {...props}
    />
  ),
);
FormCard.displayName = "FormCard";

export { FormCard };
export { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./card";
```

### 2. Remplacer `Card` par `FormCard` dans les 12 fichiers du simulateur

Pour chacun : changer l'import (`Card` → `FormCard` depuis `@/components/ui/form-card`) et le JSX (`<Card>` → `<FormCard>`). Retirer la classe `shadow-form` désormais redondante ajoutée à l'étape précédente. Conserver les autres classes (`border-primary`, `bg-muted/20`, etc.).

Fichiers :
- `src/components/simulator/project/SurfaceCard.tsx`
- `src/components/simulator/project/RadioCard.tsx`
- `src/components/simulator/project/LocalConstraintsForm.tsx`
- `src/components/simulator/machines/WashersConfigCard.tsx`
- `src/components/simulator/machines/DryersConfigCard.tsx`
- `src/components/simulator/machines/MachineCounter.tsx`
- `src/components/simulator/charges/FixedCostsCard.tsx`
- `src/components/simulator/charges/VariableCostsCard.tsx`
- `src/components/simulator/results/ResultsHeroKpis.tsx`
- `src/components/simulator/results/ResultsSummaryCard.tsx`
- `src/components/simulator/results/PartialInsightsList.tsx`
- `src/components/simulator/results/PackChoiceCard.tsx`

### 3. Vérification

- `bun run build` doit passer.
- Contrôle visuel : les cartes du simulateur affichent bien l'ombre douce (X:1, Y:2, Blur:2, #000 10%), identique à celle des champs de formulaire.
- Le reste de l'app (dashboard, settings, etc.) reste inchangé — aucun risque de régression puisque `Card` n'est pas modifié.

## Détails techniques

`FormCard` réexporte les sous-composants pour minimiser la duplication et permettre un import unique par fichier. Aucune modification à `card.tsx`, `tailwind.config.ts`, ou `lib/utils.ts`.
