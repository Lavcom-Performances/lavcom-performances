## Objectif

Refondre `OpeningHoursCard` pour proposer deux Select (heures + jours) avec option "personnalisé" révélant des inputs inline.

## Comportement UI

**Champ 1 — Heures d'ouverture** (Select, options depuis `OPENING_HOURS_OPTIONS`)

- Options standard : `7h-21h`, `7h-22h`, `6h-22h`, `24h/24`
- Option `custom` = "Horaires personnalisés…"
- Si `custom` sélectionné → deux Input inline apparaissent :
  - Horaire d'ouverture (`<input type="time">`)
  - Horaire de fermeture (`<input type="time">`)
- Sinon → inputs masqués

**Champ 2 — Jours d'ouverture** (Select, options depuis `OPENING_DAYS_OPTIONS`)

- Options standard : `7/7`, `6/7`
- Option `custom` = "Jours personnalisés…"
- Si `custom` sélectionné → 7 Checkbox inline (Lun → Dim)
- Sinon → checkboxes masquées

## Changements techniques

1. `**src/config/simulatorFormOptions.ts**`
  - Corriger la coquille "fermé le dimanche" (parenthèse manquante) dans `OPENING_DAYS_OPTIONS`.
  - Ajouter un export `WEEK_DAYS` : `[{ value: 'mon', label: 'Lun' }, …, { value: 'sun', label: 'Dim' }]` pour piloter les checkboxes.
2. `**src/components/simulator/project/OpeningHoursCard.tsx**` (réécriture)
  - État local (`useState`) pour :
    - `hoursPreset: OpeningHoursValue` (défaut vide/undefined)
    - `customOpenTime`, `customCloseTime` (strings)
    - `daysPreset: OpeningDaysValue`
    - `customDays: Set<string>`
  - Deux `FormField` empilés dans un même conteneur (garde le style existant).
  - Rendu conditionnel des inputs custom uniquement quand `preset === 'custom'`.
  - Composants shadcn utilisés : `Select`, `Input`, `Checkbox`, `Label`.
  - Aucune persistance dans `SimulationProject` pour cette itération (le champ existant `opening_hours_description` reste inchangé) — purement présentationnel, comme le composant actuel. À confirmer si un branchement store est attendu (voir question ci-dessous).

## Hors périmètre

- Pas de modification du store `useSimulationProject` ni du type `SimulationProject`.
- Pas de validation (`useSimulationValidation`) modifiée.

## Question ouverte

Le composant actuel n'écrit dans aucun store. Faut-il, dans cette même tâche, brancher les valeurs choisies sur `project.opening_hours_description` (ex. concaténation `"7h-21h · 6/7"` ou nouveau champ `opening_days_description`) ? Sinon je laisse le composant purement présentationnel comme aujourd'hui.  
=> Laisser le composant.