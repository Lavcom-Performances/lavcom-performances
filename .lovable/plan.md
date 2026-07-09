## Plan : Créer un token de box-shadow réutilisable

### Fichiers concernés
1. `tailwind.config.ts`
2. `src/components/simulator/project/FormField.tsx`

### Changements

#### 1. `tailwind.config.ts`
Ajouter un nouveau token `shadow-form` dans la section `boxShadow` :
```
'shadow-form': '1px 2px 2px 0px rgba(0, 0, 0, 0.1)',
```

Paramètres :
- X = 1px
- Y = 2px
- Blur = 2px
- Spread = 0px
- Couleur = #000000 10%

#### 2. `src/components/simulator/project/FormField.tsx`
Remplacer `shadow-card` par `shadow-form` aux deux points d'injection (enfant direct et `SelectTrigger` imbriqué).

### Pourquoi
Le token `shadow-card` est un shadow générique (0 1px 3px…). Un token dédié `shadow-form` permet de centraliser la définition exacte demandée et de la réutiliser sur d'autres composants sans duplication de classes arbitraires.

### Validation
- `bun run build` pour confirmer la compilation.
- Vérification visuelle que l'ombre fine noire s'applique correctement aux champs de formulaire.
