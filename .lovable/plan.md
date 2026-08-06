# Message conditionnel de rentabilité dans PaywallCallout

Le bloc `PaywallCallout` affiche aujourd'hui un titre et un texte statiques ("Projet au-dessus du seuil de rentabilité"). Il doit devenir dynamique, comme l'ancien simulateur, selon que le projet est rentable ou non — avec les chiffres affichés mais floutés (cohérent avec la carte Rentabilité avant paiement).

## Ce qui sera fait

1. **Calcul de rentabilité (nouveau)**
   Ajouter `src/utils/profitabilityCalculations.ts` avec une fonction pure `calculateProfitability(project)` qui reprend la logique de l'ancien simulateur, adaptée aux types du nouveau (`SimulationProject` de `src/types/simulator.types.ts`) :
   - CA mensuel = `totalRevenue` (déjà calculé par `calculateRevenueBreakdown`)
   - total charges fixes = somme des `fixedCosts.amount`
   - % charges variables = somme des `variableCosts.percent` ; charges variables = CA × %
   - seuil de rentabilité mensuel = fixes / (1 − %/100), `null` si % ≥ 100
   - cycles/jour nécessaires = seuil / revenu moyen par cycle / 30, `null` si non calculable
   - résultat estimé = CA − variables − fixes
   - `isProfitable = résultat > 0`

2. **PaywallCallout dynamique**
   - Consommer `useSimulatorProjectContext()` et appeler `calculateProfitability`.
   - Deux états visuels :
     - **Rentable** : conserve le style vert actuel, icône `TrendingUp`.
     - **Non rentable** : style `destructive` (fond/bordure/texte via les tokens existants), icône `TrendingDown`.
   - Titre et description issus des clés i18n, avec interpolation des montants.
   - Ligne complémentaire : "Il vous faut environ **X cycles/jour** pour couvrir vos charges" (`—` si non calculable).
   - Les montants interpolés (bénéfice/mois, bénéfice/an, cycles/jour) sont rendus dans des `<span>` floutés (`blur-[3px]`, `select-none`, `aria-hidden`) — mêmes valeurs, illisibles avant paiement. Le CTA reste inchangé.
   - Formatage EUR via le formateur existant du projet (`useFormatters` / `Intl.NumberFormat` fr-EUR, cohérent avec les autres cartes).

3. **Traductions FR + EN** (`src/locales/{fr,en}/paid-simulator.json`)
   Restructurer `results.paywall` :
   - `profitable.title` / `profitable.description` (avec `{{profitMonth}}`, `{{profitYear}}`)
   - `notProfitable.title` / `notProfitable.description`
   - `cyclesNeeded` (avec `{{cycles}}`)
   - `cta` (inchangé)
   Comme les montants doivent être floutés séparément, la description utilisera `<Trans>` (ou une composition de segments) pour envelopper les valeurs dans un span flouté.

## Détails techniques

- Aucune modification de `ProfitabilityCard` dans ce lot ; elle pourra réutiliser la même fonction plus tard (les valeurs y sont encore en dur).
- Fonction de calcul pure et testable, sans dépendance React.
- Cas limites gérés : pas de machines, % variables ≥ 100, CA nul → seuil et cycles à `null`, message "non rentable".
- Vérification finale par typecheck.
