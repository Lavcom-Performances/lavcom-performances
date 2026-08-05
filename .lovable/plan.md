# i18n FR du simulateur de rentabilité `/simulator/*`

## Objectif
Externaliser tous les textes en dur des pages et composants du simulateur payant dans un nouveau namespace i18n `paid-simulator`, et brancher les composants dessus via `useTranslation("paid-simulator")`.

## Ce qui est couvert

Fichier créé : `src/locales/fr/paid-simulator.json`, organisé par zone :

```text
common        → boutons, actions, unités (m², €, /mois)
stepper       → libellés des 4 étapes + navigation (précédent/suivant)
project       → identité du projet, localisation, surface,
                horaires d'ouverture, contraintes du local, onglets
machines      → configuration machines, infos champs, résumé CA
charges       → abonnement, lignes de coûts, ajout de coût, total
results       → KPIs, rentabilité, synthèse, paywall, guide
warnings      → messages de ProjectWarnings
validation    → messages d'erreur des schémas Zod
```

## Composants à brancher (37 fichiers)

- Pages : `SimulatorProjectPage`, `SimulatorMachinesPage`, `SimulatorChargesPage`, `SimulatorResultsPage`
- Layout : `SimulatorPageHeader`, `SimulatorStepper`, `SimulatorFooterNav`
- Project : `ProjectIdentityCard`, `LocationCard`, `AddressAutocomplete`, `SurfaceCard`, `OpeningHoursCard`, `LocalConstraintsForm`, `ProjectTabs`, `ProjectDetailsCard`, `TabSectionHeading`, `RadioCard`, `FormField`, `ProjectInfoForm`
- Machines : `MachinesConfigCard`, `MachineInfosCard`, `InputFieldsInfos`, `MachineRevenueSummary`
- Charges : `CostsCard`, `CostRow`, `AddCostCard`, `AddCostButton`, `SubscriptionCard`, `TotalCostsSummary`
- Results : `ResultsSummaryCard`, `ResultsHeroKpis`, `ProfitabilityCard`, `ProjectInfos`, `PaywallCallout`, `GuideCallout`
- Transverses : `ProjectWarnings`, `ConfigHintBanner`, `ProgressBarWithValue`

## Détails techniques

1. Ajout de `paid-simulator` dans `src/lib/i18n-config.ts` : import FR + entrée dans `resources.fr` + ajout au tableau `ns`.
2. Pour les autres langues (en/es/it/de/nl), le namespace n'existe pas encore : `fallbackLng: 'fr'` s'applique déjà, donc aucune régression. Les fichiers de traduction des autres locales pourront être ajoutés plus tard.
3. Les libellés d'options de formulaire dans `src/config/simulatorFormOptions.ts` (types de projet, zones, quartiers, etc.) sont convertis en clés i18n : le fichier exporte des clés, la traduction est résolue à l'affichage dans les composants. Aucune modification de la logique métier ni des valeurs (`value`) utilisées par les calculs.
4. Les messages d'erreur Zod de `src/lib/validation/simulatorProjectSchema.ts` sont remplacés par des clés `validation.*`, traduites au moment de l'affichage.
5. Interpolation utilisée pour les valeurs dynamiques (`{{count}}`, `{{amount}}`, `{{surface}}`), y compris le hint dynamique de `SurfaceCard` et les seuils de `ProjectWarnings`.
6. Vérification finale : `bunx tsgo --noEmit` + contrôle visuel des 4 pages `/simulator/*` avec Playwright pour s'assurer qu'aucune clé brute (`paid-simulator.xxx`) ne s'affiche.

## Hors périmètre

- Aucune modification de logique de calcul, de routing, ou de style.
- Pas de traduction des autres langues dans ce lot.
- Le dashboard `/dashboard-simulator` (fichiers `src/constants/dashboard-simulator/*.strings.ts`) n'est pas touché.
