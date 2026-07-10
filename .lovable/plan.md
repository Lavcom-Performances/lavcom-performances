## Objectif

Ajouter un `hint` dynamique sous l'input de surface dans `SurfaceCard.tsx`, dont le texte change en fonction de la valeur saisie par l'utilisateur.

## Comportement

- Ajouter un state local `surface` (nombre) dans `SurfaceCard`, contrôlant l'`Input`.
- Calculer un label descriptif via une fonction `getSurfaceLabel(value)` basée sur des seuils.
- Passer ce label à la prop `hint` du `FormField`.
- **Règle critique : si aucune valeur n'est saisie (input vide), le hint ne doit pas apparaître.**

## Seuils de correspondance

Basés sur les paliers de `SURFACE_OPTIONS` (dans `useCitySearch.ts`) :

```text
< 20      → "Surface très petite pour une laverie"
20–29     → "Micro laverie"
30–39     → "Petite laverie"
40–49     → "Laverie standard"
50–59     → "Laverie moyenne"
60–79     → "Grande laverie"
80–99     → "Très grande laverie"
≥ 100     → "Laverie XXL"
```

Le hint affiché sera par ex. : `"40 m² — Laverie standard"`.

## Détails techniques

- Fichier modifié : `src/components/simulator/project/SurfaceCard.tsx` uniquement.
- Ajouter `useState` (React) pour gérer la valeur.
- `Input` : `value={surface}` + `onChange={(e) => setSurface(e.target.value)}`, type `number`.
- Fonction utilitaire locale `getSurfaceHint(value: string): string | undefined` retournant `undefined` si vide/NaN.
- Aucun import depuis `useCitySearch.ts` (les données `SURFACE_OPTIONS` y sont couplées à d'autres logiques ; on inline les seuils dans le composant pour rester léger et non-régressif).

## Validation

- `bun run build` doit passer.
- Vérification visuelle Playwright : saisir 25, 45, 100 → le hint doit changer en conséquence ; vider le champ → le hint doit disparaître.
