export interface SimulatorSelectOption<TValue extends string = string> {
  value: TValue;
  label: string;
}

export interface CountrySelectOption extends SimulatorSelectOption<CountryValue> {
  code: string;
  flag: string;
}

export type CountryValue = "fr" | "be" | "ch" | "lu" | "mc" | "de" | "nl" | "es" | "it";
export type ZoneTypeValue = "urbaine" | "peri-urbaine" | "rurale" | "commerciale";
export type SurfacePresetValue = "30" | "40" | "60" | "80";
export type OpeningHoursPresetValue = "7-22" | "6-23" | "24-7" | "custom";
export type LocalShapeValue = "rectangular" | "narrow" | "l-shape" | "corner";
export type StructuralObstacleValue = "none" | "few" | "many";
export type FacadeOptionValue = "yes" | "no" | "unknown";
export type TechnicalConstraintValue = "ok" | "check_with_installer" | "heavy_work";

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
export type SurfacePresetOption = SimulatorSelectOption<SurfacePresetValue>;
export type OpeningHoursPresetOption = SimulatorSelectOption<OpeningHoursPresetValue>;
export type LocalShapeOption = SimulatorSelectOption<LocalShapeValue>;
export type StructuralObstacleOption = SimulatorSelectOption<StructuralObstacleValue>;
export type FacadeOption = SimulatorSelectOption<FacadeOptionValue>;
export type TechnicalConstraintOption = SimulatorSelectOption<TechnicalConstraintValue>;
