# Toaster : nombre total d'erreurs sur toutes les étapes du simulateur

## Constat

Le comptage d'erreurs par section se fait dans `useSimulatorValidation.ts` avec
`sectionResult.error.flatten().fieldErrors`, puis compte le nombre de **clés de premier niveau**
qui portent au moins un message.

Conséquence :
- `projectInfo` / `localConstraints` : les champs sont à plat (`projectName`, `city`, `surface`…),
  donc une clé = un champ = comptage correct.
- `washers` / `dryers` / `charges` : les données sont des **tableaux** (`machines`, `fixedCosts`,
  `variableCosts`). Toutes les erreurs des lignes se regroupent sous une seule clé, d'où
  « 1 erreur » affichée même si 5 champs sont invalides sur 3 machines.

Le toaster lui-même (`useSimulatorStep.ts`) additionne déjà correctement les `errorCount` des
sections de l'étape : c'est bien le comptage par section qu'il faut corriger.

## Ce qui change

Comptage basé sur les **issues Zod** plutôt que sur les clés agrégées :

1. Dans `useSimulatorValidation.ts`, remplacer le calcul de `errorCount` par un décompte des
   `sectionResult.error.issues`, dédupliqué par chemin complet (`issue.path.join(".")`), afin que
   chaque champ invalide de chaque ligne de tableau compte pour 1 (et pas 2 si Zod émet deux
   messages sur le même champ).
2. Conserver `errors[section]` (premier message) tel quel : c'est ce qui alimente les messages
   inline, aucun changement de comportement d'affichage.
3. Filtrer les sections `machines`/`washers`/`dryers` : comme la donnée passée est déjà filtrée par
   type, les index de chemin restent cohérents — rien de plus à faire.

Résultat attendu :
- `/simulator/project` : comportement inchangé (déjà correct).
- `/simulator/machines` : le toaster additionne les erreurs de tous les champs de toutes les
  machines (laveuses + sécheuses).
- `/simulator/charges` : le toaster additionne les erreurs de libellé/montant/pourcentage de
  toutes les lignes de charges fixes et variables, plus l'erreur de dépassement des 100 %.

## Détails techniques

Fichier modifié : `src/hooks/useSimulatorValidation.ts` uniquement.

```ts
const paths = new Set(sectionResult.error.issues.map((i) => i.path.join(".")));
const count = paths.size;
acc[section] = { isValid: count === 0, errorCount: count };
```

Aucun changement dans `useSimulatorStep.ts`, `SimulatorFooterNav.tsx`, ni dans les pages : le texte
du toaster (« N champs à corriger avant de continuer ») reste identique et se pluralise déjà.

Vérification : `bunx tsgo --noEmit` puis contrôle manuel sur les trois étapes.
