# Refactor `FormField` avec shadcn `Field` — Option A retenue

## Étapes

### 1. Installer la primitive `Field`
`bunx shadcn@latest add field` → crée `src/components/ui/field.tsx` (exports : `Field`, `FieldLabel`, `FieldDescription`, `FieldError`, `FieldGroup`, `FieldSet`, `FieldLegend`, `FieldSeparator`, `FieldContent`, `FieldTitle`).

### 2. Réécrire `src/components/simulator/project/FormField.tsx`
Wrapper mince, **même API publique** :

```tsx
import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  htmlFor?: string;
  hint?: string;
  icon?: LucideIcon;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function FormField({ label, htmlFor, hint, icon: Icon, required, children, className }: Props) {
  return (
    <Field className={cn(className)}>
      <FieldLabel htmlFor={htmlFor} className="flex items-center gap-2 text-sm font-medium text-foreground">
        {Icon && <Icon className="h-4 w-4 shrink-0 text-foreground" />}
        <span>{label}</span>
        {required && <span className="text-destructive">*</span>}
      </FieldLabel>
      {children}
      {hint && <FieldDescription>{hint}</FieldDescription>}
    </Field>
  );
}
```

Suppression totale de `Children.map` / `cloneElement` / `injectStyle` et de l'import `SelectTrigger`.

### 3. Option A — appliquer `bg-white shadow-form` explicitement dans les appelants
Ajouter `className="bg-white shadow-form"` sur chaque `<Input>` et `<SelectTrigger>` enfant de `FormField`, dans :

- `SurfaceCard.tsx` → `<Input>` surface
- `ProjectIdentityCard.tsx` → 2 `<Input>`
- `OpeningHoursCard.tsx` → `<SelectTrigger>`
- `LocationCard.tsx` → `<SelectTrigger>` (country), `<Input>` (address, city, zip), `<SelectTrigger>` (zone)
- `LocalConstraintsForm.tsx` → `<Input id="door-width">`

Fusionner avec les classes déjà présentes (`opacity-50` sur le CP) via une simple concaténation string.

### 4. Validation
- `bun run build` doit passer.
- Vérif Playwright sur `/simulator/project` (onglets Projet + Local) : labels + icônes + `*` + hints inchangés, fond blanc + `shadow-form` toujours présents sur inputs/selects. Vérifier le hint dynamique de surface (25 → Micro laverie, vide → pas de hint).

## Hors scope
Pas de `FieldError`/validation, pas de migration des `<Label>` ad hoc hors `FormField`.
