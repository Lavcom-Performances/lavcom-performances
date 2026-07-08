// Static mock data for the new visitor simulator flow (/simulator/*).
// No business logic — placeholder values shown in the redesigned pages.

export const MOCK_PROJECT = {
  projectName: "Projet 1",
  scenarioName: "Scénario 1",
  country: "France",
  countryFlag: "🇫🇷",
  address: "",
  city: "Lyon",
  zip: "69003",
  zoneType: "urbaine",
  openingHours: "7h - 22h",
  surfaceLabel: "40 m² - Laverie standard",
  surfaceM2: 40,
  localShape: "rectangular" as const,
  structuralObstacles: "none" as const,
  doorWidthCm: 90,
  facadeModifiable: "unknown" as const,
  technicalConstraints: "check_with_installer" as const,
};

export const MOCK_WASHERS = [
  { id: "w7", capacity: 7, count: 2, price: 5.5, cyclesPerDay: 8, monthlyRevenue: 1320 },
  { id: "w10", capacity: 10, count: 2, price: 7, cyclesPerDay: 6, monthlyRevenue: 1260 },
  { id: "w18", capacity: 18, count: 1, price: 10, cyclesPerDay: 2, monthlyRevenue: 600 },
];

export const MOCK_DRYERS = [
  { id: "d14", capacity: 14, count: 2, price: 2, cyclesPerDay: 5, monthlyRevenue: 600 },
  { id: "d18", capacity: 18, count: 1, price: 3, cyclesPerDay: 4, monthlyRevenue: 360 },
];

export const MOCK_REVENUE = {
  washing: 3180,
  drying: 960,
  total: 4140,
  washingShare: 77,
  dryingShare: 23,
};

export const MOCK_FIXED_COSTS = [
  { id: "rent", label: "Loyer", amount: 1200 },
  { id: "charges", label: "Charges locatives", amount: 150 },
  { id: "loan", label: "Prêt / leasing machines", amount: 800 },
  { id: "insurance", label: "Assurance", amount: 120 },
  { id: "cfe", label: "CFE (Cotisation Foncière)", amount: 0 },
  { id: "cleaning", label: "Ménage / entretien", amount: 250 },
];
export const MOCK_FIXED_TOTAL = 2600;

export const MOCK_VARIABLE_COSTS = [
  { id: "elec", label: "Électricité", percent: 10 },
  { id: "water", label: "Eau", percent: 4 },
  { id: "gas", label: "Gaz", percent: 0 },
  { id: "products", label: "Lessive / produits", percent: 4 },
];
export const MOCK_VARIABLE_TOTAL_PERCENT = 18;

export const MOCK_BREAKEVEN = {
  monthlyRevenue: 4140,
  breakevenRevenue: 3171,
  cyclesPerDay: 23,
};

// Form option lists moved to src/config/simulatorFormOptions.ts

export const MOCK_PACKS = [
  {
    id: "essentiel",
    name: "Essentiel",
    price: "49 €",
    highlight: false,
    features: [
      "Analyse complète de rentabilité",
      "Export PDF du rapport",
      "1 projet, 3 scénarios",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "129 €",
    highlight: true,
    features: [
      "Tout de l'Essentiel",
      "Étude de zone détaillée",
      "Projets illimités & partage",
      "Support prioritaire",
    ],
  },
];
