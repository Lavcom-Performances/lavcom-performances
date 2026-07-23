export interface SimulatorSelectOption<TValue extends string = string> {
  value: TValue;
  label: string;
}

export interface CountrySelectOption extends SimulatorSelectOption<CountryValue> {
  code: string;
  flag: string;
}

export interface OpeningHoursSelectOption extends SimulatorSelectOption<OpeningHoursValue> {
  openAt: string;
  closeAt: string;
}

export interface OpeningDaysSelectOption extends SimulatorSelectOption<OpeningDaysValue> {
  days: WeekDay[];
}

export interface LocalShapeSelectOption extends SimulatorSelectOption<LocalShapeValue> {
  shape: string | undefined;
}

export type WeekDay = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

export type CountryValue = "fr" | "be" | "ch" | "lu" | "mc" | "de" | "nl" | "es" | "it";
export type ZoneTypeValue = "centre-ville"
  | "quartier-residentiel"
  | "zone-commerciale"
  | "zone-universitaire"
  | "zone-touristique"
  | "banlieue";
export type OpeningHoursValue = "7h-21h" | "7h-22h" | "6h-22h" | "24h/24" | "custom";
export type OpeningDaysValue = "7/7" | "6/7" | "custom";
export type LocalShapeValue = "rectangular" | "narrow" | "l-shape" | "corner" | "unknown";
export type StructuralObstacleValue = "none" | "few" | "many" | "unknown";
export type FacadeOptionValue = "yes" | "no" | "unknown";
export type TechnicalConstraintValue = "ok" | "check_with_installer" | "heavy_work" | "unknown";

export type CountryOption = CountrySelectOption;
export type ZoneTypeOption = SimulatorSelectOption<ZoneTypeValue>;
export type OpeningHoursOption = OpeningHoursSelectOption;
export type OpeningDaysOption = OpeningDaysSelectOption;
export type LocalShapeOption = LocalShapeSelectOption;
export type StructuralObstacleOption = SimulatorSelectOption<StructuralObstacleValue>;
export type FacadeOption = SimulatorSelectOption<FacadeOptionValue>;
export type TechnicalConstraintOption = SimulatorSelectOption<TechnicalConstraintValue>;
