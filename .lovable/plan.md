# Scroll automatique vers la première erreur au clic sur « Continuer »

## Objectif

Quand l'utilisateur clique sur `Next`/`Continuer` et que des champs sont invalides, en plus du
toaster récapitulatif, la page défile automatiquement jusqu'au premier message d'erreur visible et
met le focus sur le champ concerné.

## Fonctionnement

Tous les messages d'erreur de champ du simulateur passent par le composant `FieldError`, qui rend
un élément portant `role="alert"` et `data-slot="field-error"`. Les messages de section rendus en
`<span className="text-destructive">` n'ont pas besoin d'être ciblés : dès qu'ils apparaissent, au
moins une erreur de champ est présente et sert de cible au scroll.

Le premier message d'erreur **présent dans le DOM et visible** (donc hors onglet inactif) est
sélectionné dans l'ordre du document, puis :
- `scrollIntoView({ behavior: "smooth", block: "center" })`
- focus sur le champ associé (input/select le plus proche) sans re-scroller.

Cas de l'étape `/simulator/project` : l'onglet contenant la première section invalide est déjà
basculé par `onInvalid`. Le scroll est déclenché après le rendu (double `requestAnimationFrame`)
pour que le contenu de l'onglet soit monté et mesurable.

Le comportement respecte `prefers-reduced-motion` (défilement instantané si l'utilisateur le
demande).

## Fichiers concernés

1. **Nouveau** `src/utils/scrollToFirstError.ts`
   - `scrollToFirstError(root?: HTMLElement)` : sélectionne `[data-slot="field-error"]`, ignore les
     éléments non visibles (`offsetParent === null` / `getClientRects().length === 0`), scrolle vers
     le premier et met le focus sur `input, select, textarea, [role="combobox"]` du conteneur
     `[data-slot="field"]` parent, avec `preventScroll: true`.

2. `src/hooks/useSimulatorStep.ts`
   - Dans `guardNext`, après `setAttempted(true)`, le toaster et `options.onInvalid?.()`,
     planifier `requestAnimationFrame(() => requestAnimationFrame(() => scrollToFirstError()))`
     avant de retourner `false`.

Aucun changement dans `SimulatorFooterNav.tsx`, les cartes machines/charges, les schémas Zod ou les
fichiers de traduction.

## Vérification

`bunx tsgo --noEmit`, puis test manuel des trois étapes : champs vides → clic sur Continuer → le
toaster s'affiche et la page défile vers la première erreur, y compris après bascule d'onglet sur
l'étape « Projet ».
