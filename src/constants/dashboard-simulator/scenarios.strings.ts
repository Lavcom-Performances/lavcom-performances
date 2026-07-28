export const SCENARIOS_STRINGS = {
  backToProjects: "Revenir à mes projets",
  backToScenarios: "Revenir à mes scénarios",
  newScenario: "Nouveau scénario",
  compareTwo: "Comparer 2 scénarios",
  title: "Scénarios",
  countLabel: "/ {total} scénarios créés",
  selectedScenario: "Scénario sélectionné : {name}",
  searchPlaceholder: "Rechercher un scénario…",
  reference: "Référence",
  stepLabel: "étape {step}/{total}",
  emptyTitle: "Aucun scénario pour le moment",
  emptyDescription:
    "Créez un premier scénario pour tester vos hypothèses de machines et de charges.",
  emptyCta: "Créer un scénario",
  noResultsTitle: "Aucun scénario ne correspond à votre recherche",
  noResultsDescription: "Essayez un autre nom de scénario ou changez de filtre.",
} as const;

export const EDITOR_STRINGS = {
  savedAgo: "Enregistré il y a {when}",
  mainScenario: "Scénario principal : {name}",
  mainScenarioBadge: "Scénario principal",
  appliedScenario: "Scénario appliqué",
  appliedScenarioHint:
    "Le scénario appliqué définit les valeurs Machines & Charges affichées dans ce projet.",
  readOnly: "lecture seule",
  editProjectInfo: "Modifier infos du projet",
  projectLabel: "Projet : {name}",
  steps: ["Projet & localisation", "Contraintes du local", "Machines", "Charges"],
  fields: {
    projectName: "Nom du projet",
    country: "Pays",
    address: "Adresse",
    city: "Ville",
    postalCode: "Code postal",
    zoneType: "Type de zone",
    openingHours: "Horaires d'ouverture",
  },
  kpis: {
    monthlyRevenue: "CA mensuel estimé",
    netMargin: "Marge nette",
    annualRoi: "ROI annuel",
    payback: "Retour sur invest.",
  },
  breakdownTitle: "Répartition du CA mensuel",
  breakdown: {
    totalCosts: "Charges totales",
    otherExpenses: "Autres dépenses",
    netMargin: "Marge nette",
  },
  feasibility: "Faisabilité",
  feasibilityOk: "Projet viable",
} as const;
