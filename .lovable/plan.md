## Objectif
Harmoniser l'apparence des cartes du simulateur en appliquant la classe `shadow-form` sur toutes les cartes de section principales et sous-cartes, sans toucher aux callouts colorés qui ont déjà un traitement visuel distinctif.

## Cartes modifiées (ajout de `shadow-form`)

**Project**
- `src/components/simulator/project/ProjectDetailsCard.tsx` — déjà présent, aucun changement
- `src/components/simulator/project/SurfaceCard.tsx` — `<Card>` → `<Card className="shadow-form">`
- `src/components/simulator/project/RadioCard.tsx` — `<Card>` → conserver classes existantes + `shadow-form`
- `src/components/simulator/project/LocalConstraintsForm.tsx` (l.47) — `<Card>` → `<Card className="shadow-form">`

**Machines**
- `src/components/simulator/machines/WashersConfigCard.tsx`
- `src/components/simulator/machines/DryersConfigCard.tsx`
- `src/components/simulator/machines/MachineCounter.tsx` — conserver `border-border bg-muted/20` + ajouter `shadow-form`

**Charges**
- `src/components/simulator/charges/FixedCostsCard.tsx`
- `src/components/simulator/charges/VariableCostsCard.tsx`

**Résultats**
- `src/components/simulator/results/ResultsHeroKpis.tsx`
- `src/components/simulator/results/ResultsSummaryCard.tsx`
- `src/components/simulator/results/PartialInsightsList.tsx`
- `src/components/simulator/results/PackChoiceCard.tsx` (si présent, à vérifier au moment de l'édition)

## Cartes exclues (callouts colorés)
- `PaywallCallout.tsx` (bordure/gradient primary)
- `GuideCallout.tsx` (bordure/fond orange)
- `ChargesTotalsBanner.tsx` (bordure/fond primary)
- `MachineMixSummary.tsx` (bordure/fond primary)

## Validation
- `bun run build` pour s'assurer que rien ne casse.
