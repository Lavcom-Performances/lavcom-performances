## Objectif

Dans `src/components/simulator/project/SurfaceCard.tsx`, remplacer le `Select` brut par le composant `FormField` custom (`src/components/simulator/project/FormField.tsx`) avec un `<Input />` numérique en enfant, pour permettre à l'utilisateur de saisir manuellement la surface de sa laverie en m².

## Changements

**Fichier modifié :** `src/components/simulator/project/SurfaceCard.tsx`

- Supprimer les imports `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue` et `SURFACE_PRESETS`.
- Supprimer le `CardHeader` / `CardTitle` actuel (le label + icône + astérisque sont désormais portés par `FormField`).
- Conserver `FormCard` + `CardContent` comme conteneur.
- Utiliser `FormField` avec :
  - `label="Surface du local"`
  - `icon={Ruler}`
  - `required`
  - `htmlFor="surface"`
  - `hint="Surface totale en m² (ex : 45)"`
- Enfant : `<Input id="surface" type="number" min={1} placeholder="Ex : 45" />` avec suffixe `m²` via un wrapper `relative` (ou un simple `<span>` à côté).

## Détails techniques

- `FormField` injecte automatiquement `bg-white shadow-form` sur son enfant direct (`Input`), donc pas de style à ajouter.
- Composant non contrôlé pour l'instant (`defaultValue="40"` initial retiré, ou converti en `defaultValue={40}` sur l'Input) — pas de logique de state ajoutée, conforme au reste du fichier actuel qui n'a pas de handler.
- Aucun autre fichier n'importe `SURFACE_PRESETS` via `SurfaceCard`, donc suppression sans impact.

## Rendu attendu

```
[Ruler] Surface du local *
[  45          ] m²
Surface totale en m² (ex : 45)
```
