export interface SimulatorSelectOption<TValue extends string = string> {
  value: TValue;
  label: string;
}

export interface CountrySelectOption extends SimulatorSelectOption<CountryValue> {
  code: string;
  flag: string;
}

export interface LocalShapeSelectOption extends SimulatorSelectOption<LocalShapeValue> {
  shape: string | undefined;
}

export type CountryValue = "fr" | "be" | "ch" | "lu" | "mc" | "de" | "nl" | "es" | "it";
export type ZoneTypeValue = "centre-ville"
  | "quartier-residentiel"
  | "zone-commerciale"
  | "zone-universitaire"
  | "zone-touristique"
  | "banlieue";
export type OpeningHoursOptionValue = "7h-21h" | "7h-22h" | "6h-22h" | "24h/24" | "24h/24-badge" | "custom";
export type LocalShapeValue = "rectangular" | "narrow" | "l-shape" | "corner" | "unknown";
export type StructuralObstacleValue = "none" | "few" | "many" | "unknown";
export type FacadeOptionValue = "yes" | "no" | "unknown";
export type TechnicalConstraintValue = "ok" | "check_with_installer" | "heavy_work" | "unknown";

export type FixedCostCategory =
  | "Loyer / Charges locatives"
  | "Prêt / Leasing"
  | "Assurance"
  | "Impôt / Taxe"
  | "Salaire / Charges sociales"
  | "Ménage / Entretien"
  | "Autre";

export type CountryOption = CountrySelectOption;
export type ZoneTypeOption = SimulatorSelectOption<ZoneTypeValue>;
export type OpeningHoursPresetOption = SimulatorSelectOption<OpeningHoursOptionValue>;
export type LocalShapeOption = LocalShapeSelectOption;
export type StructuralObstacleOption = SimulatorSelectOption<StructuralObstacleValue>;
export type FacadeOption = SimulatorSelectOption<FacadeOptionValue>;
export type TechnicalConstraintOption = SimulatorSelectOption<TechnicalConstraintValue>;
