import type {
  CountryOption,
  FacadeOption,
  FixedCostCategory,
  LocalShapeOption,
  OpeningHoursOption,
  OpeningDaysOption,
  StructuralObstacleOption,
  TechnicalConstraintOption,
  ZoneTypeOption,
} from "@/types/simulatorFormOptions.types";
import { MachineConfig, FixedCostItem, VariableCostItem } from "@/types/simulator.types";
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

export const FIXED_COST_CATEGORIES: readonly FixedCostCategory[] = [
  "Loyer / Charges locatives",
  "Prêt / Leasing",
  "Assurance",
  "Impôt / Taxe",
  "Salaire / Charges sociales",
  "Ménage / Entretien",
  "Autre",
];

// Indicative values ​​for fixed costs (based on market averages)
export const defaultFixedCosts: FixedCostItem[] = [
  { id: 'rent', label: 'Loyer', amount: 1200, category: 'rent' },
  { id: 'charges', label: 'Charges locatives', amount: 150, category: 'rent' },
  { id: 'lease', label: 'Prêt / leasing machines', amount: 800, category: 'lease' },
  { id: 'insurance', label: 'Assurance', amount: 120, category: 'insurance' },
  { id: 'cfe', label: 'CFE (Cotisation Foncière)', amount: 80, category: 'tax' },
  { id: 'cleaning', label: 'Ménage / entretien', amount: 250, category: 'cleaning' },
];

// Indicative values ​​for variable costs (average % of revenue)
export const defaultVariableCosts: VariableCostItem[] = [
  { id: 'electricity', label: 'Électricité', percent: 10, category: 'electricity' },
  { id: 'water', label: 'Eau', percent: 4, category: 'water' },
  { id: 'gas', label: 'Gaz', percent: 0, category: 'gas' },
  { id: 'detergent', label: 'Lessive / produits', percent: 4, category: 'detergent' },
];

// Default machine configuration (standard small laundromat configuration)
export const defaultMachines: MachineConfig[] = [
  { id: 'wash_7kg_default', type: 'washer', capacityKg: 7, count: 2, price: 5.5, cyclesPerDay: 4 },
  { id: 'wash_10kg_default', type: 'washer', capacityKg: 10, count: 2, price: 7, cyclesPerDay: 3 },
  { id: 'wash_18kg_default', type: 'washer', capacityKg: 18, count: 1, price: 10, cyclesPerDay: 2 },
  { id: 'dry_14kg_default', type: 'dryer', capacityKg: 14, count: 2, price: 2, cyclesPerDay: 5 },
  { id: 'dry_18kg_default', type: 'dryer', capacityKg: 18, count: 1, price: 3, cyclesPerDay: 4 },
];

