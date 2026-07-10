## Objectif
Modifier `SurfaceCard.tsx` pour remplacer le `Select` par un champ de saisie manuelle (`Input`) encapsulé dans le composant `FormField`, tout en conservant la structure de carte `FormCard`.

## Fichiers concernés
- `src/components/simulator/project/SurfaceCard.tsx`

## Détails d'implémentation

### SurfaceCard.tsx
- **Conserver** l'import de `FormCard`, `CardHeader`, `CardTitle`, `CardContent` depuis `@/components/ui/form-card`.
- **Conserver** l'import de l'icône `Ruler` depuis `lucide-react` pour le titre de la carte.
- **Remplacer** les imports liés à `Select` par l'import de `Input` depuis `@/components/ui/input`.
- **Ajouter** l'import de `FormField` depuis `./FormField`.
- **Retirer** l'import de `SURFACE_PRESETS`.
- **Remplacer** le contenu du composant :
  - Garder la structure `FormCard` > `CardHeader` > `CardTitle` avec l'icône `Ruler`.
  - Dans `CardContent`, utiliser `FormField` avec les props suivantes :
    - `label="Surface totale du local en m²"`
    - `htmlFor="surface"`
    - `required={true}`
    - Aucune prop `hint` ni `icon`.
  - Le `FormField` doit encapsuler un `Input` de type `number` avec `id="surface"` et `placeholder="Ex: 40"`.
  - **Ajouter** un `<span>` immédiatement après le `Input` (dans le même conteneur flex) pour afficher "m²" (avec le caractère Unicode ² directement, pas de balise `<sup>`).

### Validation
- Exécuter `bun run build` pour vérifier l'absence d'erreurs de compilation.
- Vérifier visuellement que la carte affiche correctement le champ numérique avec l'unité "m²" à côté.