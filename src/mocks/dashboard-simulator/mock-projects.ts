import type { DashboardProject } from "@/types/dashboard-simulator";

interface Seed {
  name: string;
  city: string;
  district: string;
  surface: number;
  zone: string;
  validated: boolean;
  address: string;
  postalCode: string;
  zoneType: string;
}

const SEEDS: Seed[] = [
  { name: "Laverie Bastille", city: "Paris", district: "Paris 11e", surface: 95, zone: "Zone B", validated: true, address: "3 place de la Bastille", postalCode: "75011", zoneType: "Quartier résidentiel dense" },
  { name: "Laverie République", city: "Paris", district: "Paris 5e", surface: 70, zone: "Zone A", validated: true, address: "12 rue Monge", postalCode: "75005", zoneType: "Quartier étudiant" },
  { name: "Lyon Part-Dieu", city: "Lyon", district: "Lyon 3e", surface: 110, zone: "Zone B", validated: false, address: "24 rue Garibaldi", postalCode: "69003", zoneType: "Quartier d'affaires" },
  { name: "Marseille Joliette", city: "Marseille", district: "Marseille 2e", surface: 85, zone: "Zone B", validated: true, address: "8 place de la Joliette", postalCode: "13002", zoneType: "Quartier résidentiel dense" },
  { name: "Bordeaux Chartrons", city: "Bordeaux", district: "Chartrons", surface: 78, zone: "Zone A", validated: false, address: "45 cours Portal", postalCode: "33000", zoneType: "Quartier résidentiel" },
  { name: "Lille Wazemmes", city: "Lille", district: "Wazemmes", surface: 62, zone: "Zone C", validated: true, address: "17 rue Gambetta", postalCode: "59000", zoneType: "Quartier étudiant" },
  { name: "Nantes Hauts-Pavés", city: "Nantes", district: "Hauts-Pavés", surface: 92, zone: "Zone B", validated: false, address: "6 rue du Calvaire", postalCode: "44000", zoneType: "Quartier résidentiel" },
  { name: "Toulouse Saint-Cyprien", city: "Toulouse", district: "Saint-Cyprien", surface: 105, zone: "Zone B", validated: true, address: "31 allées Charles de Fitte", postalCode: "31300", zoneType: "Quartier résidentiel dense" },
  { name: "Strasbourg Krutenau", city: "Strasbourg", district: "Krutenau", surface: 58, zone: "Zone C", validated: false, address: "9 rue de Zurich", postalCode: "67000", zoneType: "Quartier étudiant" },
  { name: "Rennes Villejean", city: "Rennes", district: "Villejean", surface: 74, zone: "Zone C", validated: true, address: "2 avenue Gaston Berger", postalCode: "35000", zoneType: "Campus universitaire" },
  { name: "Montpellier Antigone", city: "Montpellier", district: "Antigone", surface: 88, zone: "Zone B", validated: false, address: "14 place du Nombre d'Or", postalCode: "34000", zoneType: "Quartier résidentiel" },
  { name: "Nice Libération", city: "Nice", district: "Libération", surface: 66, zone: "Zone A", validated: true, address: "22 avenue Malausséna", postalCode: "06000", zoneType: "Quartier commerçant" },
  { name: "Grenoble Berriat", city: "Grenoble", district: "Berriat", surface: 81, zone: "Zone C", validated: false, address: "40 cours Berriat", postalCode: "38000", zoneType: "Quartier résidentiel" },
  { name: "Reims Clairmarais", city: "Reims", district: "Clairmarais", surface: 99, zone: "Zone B", validated: true, address: "5 rue Édouard Mignot", postalCode: "51100", zoneType: "Quartier en développement" },
  { name: "Le Havre Danton", city: "Le Havre", district: "Danton", surface: 120, zone: "Zone C", validated: false, address: "18 rue Danton", postalCode: "76600", zoneType: "Quartier résidentiel dense" },
];

const SCENARIO_COUNTS = [5, 4, 3, 6, 0, 2, 1, 8, 0, 3, 4, 2, 1, 5, 0];
const MAIN_SCENARIO_NAMES = ["Réaliste", "Optimiste", "Pessimiste", "Équilibré"];

function daysAgo(n: number): string {
  const d = new Date(2026, 5, 20);
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

export const MOCK_PROJECTS: DashboardProject[] = SEEDS.map((seed, index) => {
  const scenarioCount = SCENARIO_COUNTS[index];
  const computed = seed.validated && scenarioCount > 0;
  const base = 11_500 + index * 470;

  return {
    id: `project-${index + 1}`,
    name: seed.name,
    city: seed.city,
    district: seed.district,
    surface: seed.surface,
    zone: seed.zone,
    status: seed.validated ? "validated" : "in_progress",
    createdAt: daysAgo(120 - index * 6),
    updatedAt: daysAgo(index * 2),
    scenarioCount,
    mainScenarioId: scenarioCount > 0 ? `scenario-${index + 1}-1` : null,
    mainScenarioName: scenarioCount > 0 ? MAIN_SCENARIO_NAMES[index % MAIN_SCENARIO_NAMES.length] : null,
    address: seed.address,
    postalCode: seed.postalCode,
    country: "France",
    zoneType: seed.zoneType,
    openingHours: index % 3 === 0 ? "24h / 7j" : "07h - 22h / 7j",
    kpis: {
      estimatedRevenue: computed ? base + 2_730 : null,
      monthlyResult: computed ? (index % 4 === 1 ? -1_280 : 3_820 - index * 90) : null,
      breakEven: computed ? 9_410 + index * 120 : null,
      roiMonths: computed ? 22 + (index % 7) : null,
      fixedCosts: computed ? 4_200 + index * 75 : null,
      variableRate: computed ? 19 + (index % 5) : null,
      cyclesPerDay: computed ? 82 + index * 3 : null,
    },
  };
});
