# Contrôle d'état du simulateur dans ProfitabilityCard

## Objectif

Reproduire dans `ProfitabilityCard.tsx` le comportement déjà en place dans `PaywallCallout.tsx` :
la constante `IS_SIMULATOR_PACK_ACTIVE` (défaut `false`) décide si les vrais chiffres sont affichés
ou si des valeurs factices floutées sont rendues à la place.

## Comportement attendu

- `IS_SIMULATOR_PACK_ACTIVE === true` : affichage des vraies valeurs calculées, sans flou.
- `IS_SIMULATOR_PACK_ACTIVE === false` (cas actuel, visiteur non connecté) : valeurs factices
  codées en dur dans le DOM (`1 234 €`, `1 234 €`, `≈ 00`) avec `blur-[7px]` / `blur-[3px]` et
  `aria-hidden="true"`, comme aujourd'hui. Aucune valeur réelle ne transite dans le HTML.

## Ce qui change

Fichier unique : `src/components/simulator/results/ProfitabilityCard.tsx`.

1. Brancher la carte sur les données réelles : `useSimulatorProjectContext()`,
   `calculateProfitability(project)` et `useFormatters()` (mêmes utilitaires que `PaywallCallout`).
2. Extraire trois valeurs affichées :
   - Résultat estimé mensuel → `estimatedProfitMonth` formaté en EUR.
   - Seuil de rentabilité → `breakEvenRevenueMonthly` formaté en EUR (`—` si `null`).
   - Cycles/jour nécessaires → `breakEvenCyclesPerDay` avec 1 décimale, préfixé `≈` (`—` si `null`).
3. Introduire un petit composant local `MaskedValue` et renommer `BlurredValue` en `MaskedValue`
   dans `PaywallCallout.tsx` pour un nom unique dans tous les composants ; ce composant prend
   la valeur réelle, la valeur factice et l'intensité de flou, puis :
   - rend la valeur réelle sans classe de flou ni `aria-hidden` quand le pack est actif ;
   - rend la valeur factice avec `blur-[…]`, `select-none` et `aria-hidden="true"` sinon.
4. Conserver strictement la mise en page, les tailles de texte, les couleurs et le bouton
   « Modifier les charges » existants.

## Notes

- Aucun changement de traduction : les clés `results.profitability.*` couvrent déjà les libellés.
- La constante reste locale au composant, dupliquée depuis `PaywallCallout`, en attendant le
  passage à un contexte (ou une vérification côté edge function) quand le `dashboard-simulator`
  sera opérationnel.
- Vérification : `bunx tsgo --noEmit` puis contrôle visuel de `/simulator/results`.
