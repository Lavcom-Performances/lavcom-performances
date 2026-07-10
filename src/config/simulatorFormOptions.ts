// Static option lists used by the simulator forms (selects and radio groups).
// Values here drive the UI options;

import type {
  CountryOption,
  FacadeOption,
  FixedCostCategory,
  LocalShapeOption,
  OpeningHoursPresetOption,
  StructuralObstacleOption,
  SurfacePresetOption,
  TechnicalConstraintOption,
  ZoneTypeOption,
} from "@/types/simulatorFormOptions.types";

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

export const SURFACE_PRESETS: readonly SurfacePresetOption[] = [
  { value: "30", label: "30 m² - Petite laverie" },
  { value: "40", label: "40 m² - Laverie standard" },
  { value: "60", label: "60 m² - Grande laverie" },
  { value: "80", label: "80 m² - Très grande laverie" },
];

export const OPENING_HOURS_OPTIONS: readonly OpeningHoursPresetOption[] = [
  { value: "7h-21h", label: "7h - 21h (standard)" },
  { value: "7h-22h", label: "7h - 22h (étendu)" },
  { value: "6h-22h", label: "6h - 22h (matinal)" },
  { value: "24h/24", label: "24h/24 (accès libre)" },
  { value: "24h/24-badge", label: "24h/24 avec badge" },
  { value: "custom", label: "Horaires personnalisés..." },
];

export const LOCAL_SHAPES: readonly LocalShapeOption[] = [
  { value: "rectangular", label: "Rectangulaire, murs plutôt pleins" },
  { value: "narrow", label: "Long et étroit" },
  { value: "l-shape", label: "En L / découpé" },
  { value: "corner", label: "Angle avec beaucoup de vitrines" },
];

export const STRUCTURAL_OBSTACLES: readonly StructuralObstacleOption[] = [
  { value: "none", label: "Aucun obstacle particulier" },
  { value: "few", label: "Quelques poteaux / gaines le long des murs" },
  { value: "many", label: "Plusieurs poteaux / murs porteurs gênants" },
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
