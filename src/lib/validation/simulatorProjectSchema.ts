import { z } from "zod";
import {
  ZONE_TYPES,
  OPENING_HOURS_OPTIONS,
  OPENING_DAYS_OPTIONS,
  LOCAL_SHAPES,
  STRUCTURAL_OBSTACLES,
  FACADE_OPTIONS,
  TECHNICAL_CONSTRAINTS,
  WEEK_DAYS,
} from "@/config/simulatorFormOptions";

const valuesOf = <T extends { value: string }>(options: readonly T[]): [string, ...string[]] => {
  const values = options.map((o) => o.value);
  return [values[0], ...values.slice(1)];
};

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

const weekDayEnum = z.enum(valuesOf(WEEK_DAYS) as [string, ...string[]]);

// ============ Project info ============
export const projectInfoSchema = z.object({
  projectName: z
    .string({ message: "Le nom du projet est requis" })
    .trim()
    .min(3, "Le nom du projet est requis (min. 3 caractères)")
    .max(100, "Le nom du projet est trop long (max. 100)"),
  scenarioName: z
    .string({ message: "Le nom du scénario est requis" })
    .trim()
    .min(1, "Le nom du scénario est requis")
    .max(100, "Le nom du scénario est trop long (max. 100)"),
  country: z.string().trim().min(1, "Le pays est requis"),
  address: z
    .string({ message: "L'adresse est requise" })
    .trim()
    .min(1, "L'adresse est requise")
    .max(200, "L'adresse est trop longue (max. 200)"),
  city: z.string().trim().min(1, "La ville est requise"),
  postalCode: z.string().trim().min(1, "Le code postal est requis"),
  zoneType: z.enum(valuesOf(ZONE_TYPES), {
    message: "Le type de zone est requis",
  }),
  openingHours: z
    .object({
      value: z.enum(valuesOf(OPENING_HOURS_OPTIONS), {
        message: "Les horaires d'ouverture sont requis",
      }),
      openAt: z.string().regex(TIME_REGEX, "Horaire d'ouverture invalide"),
      closeAt: z.string().regex(TIME_REGEX, "Horaire de fermeture invalide"),
    })
    .refine(
      (v) => v.value !== "custom" || v.openAt !== v.closeAt,
      { message: "Les horaires personnalisés sont invalides", path: ["closeAt"] },
    ),
  openingDays: z.object({
    value: z.enum(valuesOf(OPENING_DAYS_OPTIONS), {
      message: "Les jours d'ouverture sont requis",
    }),
    days: z.array(weekDayEnum).min(1, "Sélectionnez au moins un jour"),
  }),
});

// ============ Local constraints ============
export const localConstraintsSchema = z.object({
  surface: z
    .number({ message: "La surface est requise" })
    .min(10, "La surface est requise (min. 10 m²)")
    .max(500, "Surface maximum 500 m²"),
  localShape: z.enum(valuesOf(LOCAL_SHAPES), {
    message: "La forme du local est requise",
  }),
  structuralObstacles: z.enum(valuesOf(STRUCTURAL_OBSTACLES), {
    message: "Précisez les obstacles structurels",
  }),
  doorWidth: z
    .number({ message: "La largeur de porte est requise" })
    .min(60, "Largeur de porte minimum 60 cm")
    .max(300, "Largeur de porte maximum 300 cm"),
  canModifyFacade: z.enum(valuesOf(FACADE_OPTIONS), {
    message: "Précisez la possibilité de modifier la façade",
  }),
  technicalConstraints: z.enum(valuesOf(TECHNICAL_CONSTRAINTS), {
    message: "Précisez les contraintes techniques",
  }),
});

// ============ Machines ============
const machineConfigSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["washer", "dryer"]),
  capacityKg: z.number().min(3, "Capacité invalide"),
  count: z.number().int().min(1, "Nombre invalide"),
  price: z.number().min(0.5, "Prix invalide"),
  cyclesPerDay: z.number().min(0, "Cycles/jour invalide"),
});

export const machinesSchema = z.object({
  machines: z
    .array(machineConfigSchema)
    .min(1, "Ajoutez au moins une machine")
    .refine((m) => m.some((x) => x.count > 0), {
      message: "Configurez au moins une machine active",
    }),
});

// ============ Charges ============
const fixedCostCategoryEnum = z.enum([
  "rent",
  "lease",
  "subscription",
  "insurance",
  "tax",
  "salary",
  "cleaning",
  "other",
]);

const variableCostCategoryEnum = z.enum([
  "electricity",
  "water",
  "gas",
  "detergent",
  "other",
]);

const fixedCostSchema = z.object({
  id: z.string().min(1),
  label: z.string().trim().min(1, "Libellé requis"),
  amount: z.number().min(0, "Montant invalide"),
  category: fixedCostCategoryEnum,
});

const variableCostSchema = z.object({
  id: z.string().min(1),
  label: z.string().trim().min(1, "Libellé requis"),
  percent: z.number().min(0, "Valeur invalide").max(100, "0–100 %"),
  category: variableCostCategoryEnum,
});

export const chargesSchema = z
  .object({
    fixedCosts: z.array(fixedCostSchema),
    variableCosts: z.array(variableCostSchema),
  })
  .refine(
    (v) => v.variableCosts.reduce((sum, c) => sum + (c.percent ?? 0), 0) <= 100,
    { message: "Total des charges variables > 100 %", path: ["variableCosts"] },
  );

// ============ Global ============
export const simulatorProjectSchema = projectInfoSchema
  .merge(localConstraintsSchema)
  .merge(machinesSchema)
  .merge(
    z.object({
      fixedCosts: z.array(fixedCostSchema),
      variableCosts: z.array(variableCostSchema),
    }),
  );

export type SimulatorProjectInput = z.infer<typeof simulatorProjectSchema>;

export const sectionSchemas = {
  projectInfo: projectInfoSchema,
  localConstraints: localConstraintsSchema,
  machines: machinesSchema,
  charges: chargesSchema,
} as const;

export type SimulatorValidationSection = keyof typeof sectionSchemas;
