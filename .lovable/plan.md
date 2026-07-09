## Objectif
Modifier `FormField.tsx` pour appliquer automatiquement `bg-white` et `shadow-lavcom` sur chaque enfant shadcn (Input, Select, Textarea, etc.) via `React.cloneElement`.

## Étapes

1. **Créer le token CSS `shadow-lavcom`** dans `src/index.css` (si absent) et vérifier qu'il est utilisable via Tailwind.

2. **Modifier `FormField.tsx`** :
   - Importer `Children`, `cloneElement`, `isValidElement` depuis `react`.
   - Importer `cn` depuis `@/lib/utils`.
   - Avant le rendu, mapper sur `children` : pour chaque enfant valide, cloner l'élément en fusionnant `className` avec `bg-white shadow-lavcom` via `cn()`.
   - Rendre les enfants modifiés à la place de `{children}` brut.

3. **Nettoyer les wrappers inutiles** dans `LocationCard.tsx` :
   - Les champs "Adresse", "Ville" et "Code postal" utilisent actuellement un `<div className="relative">` pour positionner une icône `MapPin`.
   - Remplacer ce pattern par un usage direct de l'Input shadcn avec l'icône intégrée via la prop `className` (ex: `pl-9` pour l'icône), ou déplacer l'icône hors du `children` de `FormField`.
   - Objectif : garantir que `FormField` reçoit bien le composant shadcn comme `children` direct.

4. **Vérifier `Select`** :
   - `Select` étant un composé, `cloneElement` appliquera la classe sur le wrapper `<Select>`. Si le rendu visuel nécessite que la classe soit sur `SelectTrigger`, ajuster en conséquence (soit en ciblant le trigger dans les composants consommateurs, soit en documentant la limitation).

5. **Validation** :
   - Compiler le projet (`bun run build` ou équivalent).
   - Vérifier visuellement que les inputs/selects du simulateur affichent bien le fond blanc et l'ombre Lavcom.
