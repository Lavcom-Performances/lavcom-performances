# Documentation d'onboarding — Nouveau simulateur de rentabilité

Objectif : produire un document unique, de qualité professionnelle, permettant à un nouveau développeur de comprendre en une lecture ce qui a été construit depuis la création du nouveau simulateur (`/simulator/*`) et de son dashboard (`/dashboard-simulator/*`), pourquoi, et comment y contribuer.

## Livrable

Un fichier : `docs/simulateur-v2-onboarding.md` (français, ton technique, tableaux + diagrammes ASCII/Mermaid).

Les docs existantes (`docs/simulateur-rentabilite.md`, `docs/simulateur-architecture.md`) décrivent l'ancien parcours `/simulateur` et `/simulation` : elles ne sont pas modifiées, mais le nouveau document ouvre par une section de positionnement qui explique clairement les trois générations coexistantes et renvoie vers elles.

## Structure du document

1. **Contexte et périmètre** — pourquoi un nouveau simulateur, ce qui change vs `/simulateur` et `/simulation`, ce qui est encore statique/mock.
2. **Cartographie des routes** — `/simulator/project|machines|charges|results`, redirections, `/dashboard-simulator/*` (projets, scénarios, comparateurs, rapports, achats, compte), avec le layout appliqué à chaque groupe.
3. **Architecture applicative** — arborescence commentée de `src/components/simulator/*` (project, machines, charges, results, layout), `src/components/dashboard-simulator/*` (layout, overview, projects, scenarios, comparison, shared), pages, contextes, hooks, utils, types, locales.
4. **Gestion d'état** — `SimulatorProjectContext` + `useSimulatorProject` (valeurs par défaut, persistance localStorage, reset), `SimulatorStepContext` + `useSimulatorStep` (navigation par étape, `guardNext`).
5. **Validation des formulaires** — schémas Zod de `src/lib/validation/simulatorProjectSchema.ts`, comptage réel des erreurs par page, toaster, scroll automatique vers la première erreur (`scrollToFirstError.ts`), messages i18n.
6. **Moteur de calcul** — `profitabilityCalculations.ts` et `machineRevenueCalculations.ts` : formules (CA mensuel, charges fixes/variables, seuil de rentabilité, cycles/jour, résultat estimé), conventions (30 jours/mois, EUR), cas limites.
7. **Page Résultats et paywall** — composition des cartes, message conditionnel rentable/non rentable, masquage des chiffres via `MaskedValue`, drapeau `IS_SIMULATOR_PACK_ACTIVE` et note explicite sur son remplacement futur (contexte d'accès ou edge function côté serveur).
8. **Dashboard simulateur** — état actuel (données mock via `src/mocks/dashboard-simulator/*` et hooks `use-dashboard-*`), primitives partagées (`KpiTile`, `DataTable`, `DeltaPill`, `StatusBadge`), points de branchement pour les vraies données.
9. **Design system et conventions UI** — `FormField` basé sur les primitives `Field`, `FormCard`/`shadow-form`, `SimulatorTabsTrigger`, tokens sémantiques (interdiction des couleurs en dur), responsive.
10. **Internationalisation** — namespace `paid-simulator` (FR/EN), enregistrement dans `i18n-config`, conventions de nommage des clés, règle « aucune chaîne en dur ».
11. **Diagrammes** — flux utilisateur des 4 étapes, flux de données (contexte → validation → calcul → affichage), arbre des routes.
12. **Guide du contributeur** — recettes courtes : ajouter un champ (type → défaut → schéma Zod → composant → clés i18n FR+EN), ajouter une étape, ajouter une carte de résultats ; commandes de vérification (typecheck, tests) et pièges connus.
13. **Dette technique et suite** — paywall client à déplacer côté serveur, dashboard sur mocks, persistance base de données, liens vers `docs/testing/simulator-test-plan.md`.

## Détails techniques

- Le contenu sera dérivé d'une lecture des fichiers réels (contextes, hooks, schéma Zod, utils de calcul, pages, mocks, locales) : aucune formule ni valeur par défaut ne sera écrite sans vérification dans le code.
- Chaque référence de fichier sera donnée en chemin relatif `src/...` afin de rester navigable.
- Les diagrammes seront en blocs ```text``` ou Mermaid, compatibles avec le rendu GitHub.
- Aucun code applicatif n'est modifié : le seul fichier créé est la documentation.
