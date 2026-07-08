
## Contexte

Comparaison du rendu actuel de `/simulator/project` avec les deux maquettes HTML fournies :
- `step1_tab1-2.html` → onglet **« Mon projet »**
- `step1_tab2-2.html` → onglet **« Contraintes du local »**

Le contenu et la répartition des cartes ne correspondent pas au design attendu.

---

## Différences identifiées

### Onglet 1 — « Mon projet »

**Actuel** : 3 cartes distinctes empilées (`ProjectIdentityCard`, `LocationCard`, `SurfaceHoursCard`).

**Design attendu** : **une seule carte unique** intitulée **« Détails du projet »** (icône Building2, sous-titre *« Ces informations nous aideront à personnaliser votre simulation »*), contenant dans l'ordre :
1. Nom du projet* + Nom du scénario (2 colonnes)
2. Pays (pleine largeur, select avec drapeau)
3. Adresse du local (input pleine largeur avec icône MapPin à l'intérieur + hint « 💡 Sélectionnez une adresse… »)
4. Ville* + Code postal (2 colonnes, code postal grisé 50 % + hint « Rempli automatiquement »)
5. Type de zone* + Horaires d'ouverture envisagés* (2 colonnes)

Chaque label est préfixé d'une **petite icône 16 px** (lucide) et suivi d'un **astérisque rouge** pour les champs requis (Nom du projet, Ville, Type de zone, Horaires).

La **Surface du local ne fait plus partie de cet onglet** — elle migre vers l'onglet 2.

### Onglet 2 — « Contraintes du local »

**Actuel** : Forme, Obstacles, [Accès + Contraintes techniques].

**Design attendu**, dans l'ordre :
1. **Nouvelle carte « Surface du local »*** (select simple « 40 m² - Laverie standard ») — déplacée depuis l'onglet 1
2. Carte « Forme du local » (radios) — déjà présente ✓
3. Carte « Obstacles structurels » (radios) — déjà présente ✓
4. Grille 2 colonnes :
   - Carte « Accès au local » (input « Largeur de la porte (cm) » + groupe radio « Façade modifiable ? »)
   - Carte « Contraintes techniques » (radios)

---

## Modifications à effectuer

### 1. Onglet 1 — nouvelle carte unique `ProjectDetailsCard.tsx`

- **Créer** `src/components/simulator/project/ProjectDetailsCard.tsx`.
- Cette carte unique **compose** en interne les 3 sous-composants existants (`ProjectIdentityCard`, `LocationCard`, et l'ex-`SurfaceHoursCard` renommé — voir ci-dessous), mais **le rendu final doit visuellement produire une seule Card shadcn** avec un unique `CardHeader` (icône Building2 + titre « Détails du projet » + description).
- Pour permettre cette composition sans casser l'existant : **adapter les 3 sous-composants** pour qu'ils exposent uniquement le contenu de leurs champs (sections internes), et non plus leur propre `<Card>` wrapper. Deux options équivalentes — retenir la plus simple :
  - **Option A (recommandée)** : les 3 sous-composants rendent juste un fragment `<>…</>` de leurs `FormField`s (retirer `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent` de chacun). `ProjectDetailsCard` les enveloppe dans une seule `<Card>` + `<CardContent className="space-y-6">`.
  - Option B : ajouter une prop `asSection?: boolean` à chacun pour basculer le wrapper.
- **Ordre de composition dans `ProjectDetailsCard`** :
  1. `<ProjectIdentityCard />` (Nom, Scénario, Pays)
  2. `<LocationCard />` (Adresse, Ville, CP, Type de zone)
  3. `<OpeningHoursCard />` (Horaires uniquement)
- Chaque `FormField` doit accepter (ou être adapté pour accepter) une prop `icon?: LucideIcon` et une prop `required?: boolean` (astérisque rouge), pour reproduire la mise en forme des labels du design.

### 2. Renommage `SurfaceHoursCard.tsx` → `OpeningHoursCard.tsx`

- **Renommer** le fichier `src/components/simulator/project/SurfaceHoursCard.tsx` en `OpeningHoursCard.tsx`, ainsi que l'export nommé `SurfaceHoursCard` → `OpeningHoursCard`.
- **Retirer** le champ « Surface du local » de ce composant : il ne conserve que le select « Horaires d'ouverture envisagés » (icône Clock, requis).
- Mettre à jour tout import (`ProjectInfoForm.tsx`, futur `ProjectDetailsCard.tsx`).

### 3. `ProjectInfoForm.tsx`

- Remplacer les 3 cartes actuelles par un unique `<ProjectDetailsCard />` en dessous de `<TabSectionHeading … />`.

### 4. Onglet 2 — ajouter la carte « Surface du local »

- **Créer** `src/components/simulator/project/SurfaceCard.tsx` : carte simple avec icône, titre « Surface du local », astérisque requis, et le select `SURFACE_PRESETS`.
- Mettre à jour `LocalConstraintsForm.tsx` pour insérer `<SurfaceCard />` en premier, avant `Forme du local`.

### 5. Ajustements & vérifications

- Étendre `FormField.tsx` (props `icon?: LucideIcon`, `required?: boolean`) sans casser les appels existants.
- Vérifier `FACADE_OPTIONS`, `TECHNICAL_CONSTRAINTS`, `LOCAL_SHAPES`, `STRUCTURAL_OBSTACLES` dans `mockData.ts` : libellés conformes au design (a priori déjà OK).
- Lancer `bunx tsgo --noEmit` et `rg` pour confirmer qu'aucun import ne pointe vers l'ancien nom `SurfaceHoursCard` ni vers un wrapper `Card` supprimé.

---

## Fichiers impactés

- **Créés** : `ProjectDetailsCard.tsx`, `SurfaceCard.tsx`
- **Renommé** : `SurfaceHoursCard.tsx` → `OpeningHoursCard.tsx` (contenu allégé aux horaires uniquement)
- **Modifiés** : `ProjectIdentityCard.tsx`, `LocationCard.tsx` (wrapper `Card` retiré → rendent juste leurs `FormField`s), `ProjectInfoForm.tsx`, `LocalConstraintsForm.tsx`, `FormField.tsx`
- **Supprimés** : aucun (les sous-composants restent, mais deviennent des "sections" de la carte unique)
