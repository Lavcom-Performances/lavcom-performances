import type {
  CountryOption,
  FacadeOption,
  LocalShapeOption,
  OpeningHoursOption,
  OpeningDaysOption,
  StructuralObstacleOption,
  TechnicalConstraintOption,
  ZoneTypeOption,
} from "@/types/simulatorFormOptions.types";
import {
  MachineConfig,
  FixedCostItem,
  VariableCostItem,
  FixedCostCategory,
  VariableCostCategory,
} from "@/types/simulator.types";
import rectangleShape from "@/assets/rectangle-shape.svg";
import lShape from "@/assets/l-shape.svg";
import longRectShape from "@/assets/long-rect-shape.svg";
import squareShape from "@/assets/square-shape.svg";

// Countries with their codes and flags
export const COUNTRIES: readonly CountryOption[] = [
  { value: "fr", label: "France", code: "FR", flag: "🇫🇷" },
  { value: "be", label: "Belgique" , code: "BE", flag: "🇧🇪" },
  { value: "ch", label: "Suisse", code: "CH", flag: "🇨🇭" },
  { value: "lu", label: "Luxembourg", code: "LU", flag: "🇱🇺" },
  { value: "mc", label: "Monaco", code: "MC", flag: "🇲🇨" },
  { value: "de", label: "Allemagne", code: "DE", flag: "🇩🇪" },
  { value: "nl", label: "Pays-Bas", code: "NL", flag: "🇳🇱" },
  { value: "es", label: "Espagne", code: "ES", flag: "🇪🇸" },
  { value: "it", label: "Italie", code: "IT", flag: "🇮🇹" },
];

export const ZONE_TYPES: readonly ZoneTypeOption[] = [
  { value: "centre-ville", label: "Centre-ville" },
  { value: "quartier-residentiel", label: "Quartier résidentiel" },
  { value: "zone-commerciale", label: "Zone commerciale" },
  { value: "zone-universitaire", label: "Zone universitaire / étudiante" },
  { value: "zone-touristique", label: "Zone touristique" },
  { value: "banlieue", label: "Banlieue / Périphérie" },
];

export const OPENING_HOURS_OPTIONS: readonly OpeningHoursOption[] = [
  { value: "7h-21h", label: "7h - 21h (standard)", openAt: "07:00", closeAt: "21:00" },
  { value: "7h-22h", label: "7h - 22h (étendu)", openAt: "07:00", closeAt: "22:00" },
  { value: "6h-22h", label: "6h - 22h (matinal)", openAt: "06:00", closeAt: "22:00" },
  { value: "24h/24", label: "24h/24 (accès libre)", openAt: "00:00", closeAt: "00:00" },
  { value: "custom", label: "Horaires personnalisés...", openAt: "07:00", closeAt: "21:00" },
];

export const OPENING_DAYS_OPTIONS: readonly OpeningDaysOption[] = [
  { value: "7/7", label: "7 / 7 jours", days: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] },
  { value: "6/7", label: "6 / 7 jours (fermé le dimanche)", days: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] },
  { value: "custom", label: "Jours personnalisés...", days: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] },
];

export const WEEK_DAYS = [
  { value: "monday", label: "Lun", isWeekend: false },
  { value: "tuesday", label: "Mar", isWeekend: false },
  { value: "wednesday", label: "Mer", isWeekend: false },
  { value: "thursday", label: "Jeu", isWeekend: false },
  { value: "friday", label: "Ven", isWeekend: false },
  { value: "saturday", label: "Sam", isWeekend: true },
  { value: "sunday", label: "Dim", isWeekend: true },
] as const;

export const LOCAL_SHAPES: readonly LocalShapeOption[] = [
  { value: "rectangular", label: "Rectangulaire, murs plutôt pleins", shape: rectangleShape },
  { value: "narrow", label: "Long et étroit", shape: longRectShape },
  { value: "l-shape", label: "En L / découpé", shape: lShape },
  { value: "corner", label: "Angle avec beaucoup de vitrines", shape: squareShape },
  { value: "unknown", label: "Je ne sais pas encore", shape: undefined },
];

export const STRUCTURAL_OBSTACLES: readonly StructuralObstacleOption[] = [
  { value: "none", label: "Aucun obstacle particulier" },
  { value: "few", label: "Quelques poteaux / gaines le long des murs" },
  { value: "many", label: "Plusieurs poteaux / murs porteurs gênants" },
  { value: "unknown", label: "Je ne sais pas encore" },
];

export const FACADE_OPTIONS: readonly FacadeOption[] = [
  { value: "yes", label: "Oui, il est possible de déposer une vitrine" },
  { value: "no", label: "Non, façade non modifiable" },
  { value: "unknown", label: "Je ne sais pas encore" },
];

export const TECHNICAL_CONSTRAINTS: readonly TechnicalConstraintOption[] = [
  { value: "ok", label: "A priori OK (eau, évacuation, puissance, ventilation)" },
  { value: "check_with_installer", label: "À vérifier avec un installateur" },
  { value: "heavy_work", label: "Gros travaux à prévoir" },
  { value: "unknown", label: "Je ne sais pas encore" },
];

export const FIXED_COST_CATEGORIES: FixedCostCategory = {
  rent: { label: "Loyer", category: "rent"},
  rentalCharges: { label: "Charges locatives", category: "rent"},
  lease: { label: "Prêt / Leasing machines", category: "lease"},
  insurance: { label: "Assurance", category: "insurance"},
  cfe: { label: "CFE (Cotisation Foncière)", category: "tax"},
  taxes: { label: "Impôt / Taxe", category: "tax"},
  salary: { label: "Salaire / Charges sociales", category: "salary"},
  cleaning: { label: "Ménage / Entretien", category: "cleaning"},
  other: { label: "Autre", category: "other"},
};

export const VARIABLE_COST_CATEGORIES: VariableCostCategory = {
  electricity: { label: "Électricité", category: "electricity"},
  water: { label: "Eau", category: "water"},
  gas: { label: "Gaz", category: "gas"},
  detergent: { label: "Lessive / produits", category:"detergent"},
  other: { label: "Autre", category: "other"},
};

const getKeyname = (object: {}, value: string): string => {
  const keyValPairs = Object.entries(object);
  const keyValPair = keyValPairs.find((pair) => pair[1] === value);
  return keyValPair[0];
}

// Indicative values ​​for fixed costs (based on market averages)
export const DEFAULT_FIXED_COSTS: FixedCostItem[] = [
  {
    id: crypto.randomUUID(),
    label: FIXED_COST_CATEGORIES.rent.label,
    amount: 1200,
    category: FIXED_COST_CATEGORIES.rent.category,
  },
  {
    id: crypto.randomUUID(),
    label: FIXED_COST_CATEGORIES.rentalCharges.label,
    amount: 150,
    category: FIXED_COST_CATEGORIES.rentalCharges.category,
  },
  { 
    id: crypto.randomUUID(),
    label: FIXED_COST_CATEGORIES.lease.label,
    amount: 800,
    category: FIXED_COST_CATEGORIES.lease.category,
  },
  {
    id: crypto.randomUUID(),
    label: FIXED_COST_CATEGORIES.insurance.label,
    amount: 120,
    category: FIXED_COST_CATEGORIES.insurance.category,
  },
  {
    id: crypto.randomUUID(),
    label: FIXED_COST_CATEGORIES.cfe.label,
    amount: 80,
    category: FIXED_COST_CATEGORIES.cfe.category,
  },
  {
    id: crypto.randomUUID(),
    label: FIXED_COST_CATEGORIES.cleaning.label,
    amount: 250,
    category: FIXED_COST_CATEGORIES.cleaning.category,
  },
];

// Indicative values ​​for variable costs (average % of revenue)
export const DEFAULT_VARIABLE_COSTS: VariableCostItem[] = [
  {
    id: crypto.randomUUID(),
    label: VARIABLE_COST_CATEGORIES.electricity.label,
    percent: 10,
    category: VARIABLE_COST_CATEGORIES.electricity.category,
  },
  {
    id: crypto.randomUUID(),
    label: VARIABLE_COST_CATEGORIES.water.label,
    percent: 4,
    category: VARIABLE_COST_CATEGORIES.water.category,
  },
  {
    id: crypto.randomUUID(),
    label: VARIABLE_COST_CATEGORIES.detergent.label,
    percent: 4,
    category: VARIABLE_COST_CATEGORIES.detergent.category,
  },
];

export const MACHINES_CAPACITIES = [
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  15,
  16,
  17,
  18,
  19,
  20,
  21,
  22,
  23,
  24,
  25,
  26,
  27,
  28,
  29,
  30,
  31,
  32,
  33,
  34,
  35,
] as const;

// Default machine configuration (standard small laundromat configuration)
export const DEFAULT_MACHINES: MachineConfig[] = [
  { id: crypto.randomUUID(), type: 'washer', capacityKg: 7, count: 2, price: 5.5, cyclesPerDay: 4 },
  { id: crypto.randomUUID(), type: 'washer', capacityKg: 10, count: 2, price: 7, cyclesPerDay: 3 },
  { id: crypto.randomUUID(), type: 'washer', capacityKg: 18, count: 1, price: 10, cyclesPerDay: 2 },
  { id: crypto.randomUUID(), type: 'dryer', capacityKg: 14, count: 2, price: 2, cyclesPerDay: 5 },
  { id: crypto.randomUUID(), type: 'dryer', capacityKg: 18, count: 1, price: 3, cyclesPerDay: 4 },
];

