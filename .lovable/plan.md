## Plan : Remplacer shadow-lavcom par shadow-card dans FormField

### Fichier concerné
`src/components/simulator/project/FormField.tsx`

### Changement
Remplacer la classe `"shadow-lavcom"` par `"shadow-card"` aux deux endroits où elle est injectée via `cloneElement` :
1. Ligne 24 — sur l'enfant direct (Input, Textarea, etc.)
2. Ligne 34 — sur le `SelectTrigger` imbriqué

### Pourquoi
Le token `shadow-lavcom` est un box-shadow vert spécifique à la marque (vert lime, large diffusion). Le token `shadow-card` est une ombre noire fine et discrète (`0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)`), plus adaptée à un champ de formulaire. Aucun autre fichier n'est impacté.

### Validation
- `bun run build` pour confirmer la compilation.