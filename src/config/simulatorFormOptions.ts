// Static option lists used by the simulator forms (selects and radio groups).
// Values here drive the UI options;

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
  { value: "24h/24", label: "24h/24 (accès libre)", openAt: "00:00", closeAt: "24:00" },
  { value: "custom", label: "Horaires personnalisés...", openAt: "", closeAt: "" },
];

export const OPENING_DAYS_OPTIONS: readonly OpeningDaysOption[] = [
  { value: "7/7", label: "7 / 7 jours", days: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] },
  { value: "6/7", label: "6 / 7 jours (fermé le dimanche)", days: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] },
  { value: "custom", label: "Jours personnalisés...", days: [] },
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
