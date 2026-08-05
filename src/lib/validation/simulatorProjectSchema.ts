import { z } from "zod";
import i18n from "@/lib/i18n-config";

const tv = (key: string): string => i18n.t(key, { ns: "paid-simulator" });
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
  const values = options.map((option) => option.value);
  return [values[0], ...values.slice(1)];
};

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

const weekDayEnum = z.enum(valuesOf(WEEK_DAYS) as [string, ...string[]]);

// ============ Project info ============
export const projectInfoSchema = z.object({
  id: z.string().trim().optional(),
  projectName: z
    .string({ message: tv("validation.projectName.required") })
    .trim()
    .min(3, tv("validation.projectName.min"))
    .max(100, tv("validation.projectName.max")),
  scenarioName: z
    .string({ message: tv("validation.scenarioName.required") })
    .trim()
    .min(1, tv("validation.scenarioName.required"))
    .max(100, tv("validation.scenarioName.max")),
  country: z.string().trim().min(1, tv("validation.country.required")),
  address: z
    .string({ message: tv("validation.address.required") })
    .trim()
    .min(1, tv("validation.address.required"))
    .max(200, tv("validation.address.max")),
  city: z.string().trim().min(1, tv("validation.city.required")),
  postalCode: z.string().trim().optional(),
  departmentCode: z.string().trim().optional(),
  departmentName: z.string().trim().optional(),
  region: z.string().trim().optional(),
  zoneType: z.enum(valuesOf(ZONE_TYPES), {
    message: tv("validation.zoneType.required"),
  }),
  openingHours: z
    .object({
      value: z.enum(valuesOf(OPENING_HOURS_OPTIONS), {
        message: tv("validation.openingHours.required"),
      }),
      openAt: z.string().regex(TIME_REGEX, tv("validation.openingHours.invalidOpenAt")),
      closeAt: z.string().regex(TIME_REGEX, tv("validation.openingHours.invalidCloseAt")),
    })
    .refine(
      (v) => v.value !== "custom" || v.openAt !== v.closeAt,
      { message: tv("validation.openingHours.invalidCustom"), path: ["closeAt"] },
    ),
  openingDays: z.object({
    value: z.enum(valuesOf(OPENING_DAYS_OPTIONS), {
      message: tv("validation.openingDays.required"),
    }),
    days: z.array(weekDayEnum).min(1, tv("validation.openingDays.minOne")),
  }),
});

// ============ Local constraints ============
export const localConstraintsSchema = z.object({
  surface: z
    .number({ message: tv("validation.surface.required") })
    .min(10, tv("validation.surface.min"))
    .max(500, tv("validation.surface.max")),
  localShape: z.enum(valuesOf(LOCAL_SHAPES), {
    message: tv("validation.localShape.required"),
  }),
  structuralObstacles: z.enum(valuesOf(STRUCTURAL_OBSTACLES), {
    message: tv("validation.structuralObstacles.required"),
  }),
  doorWidth: z
    .number({ message: tv("validation.doorWidth.required") })
    .min(60, tv("validation.doorWidth.min"))
    .max(300, tv("validation.doorWidth.max")),
  canModifyFacade: z.enum(valuesOf(FACADE_OPTIONS), {
    message: tv("validation.facade.required"),
  }),
  technicalConstraints: z.enum(valuesOf(TECHNICAL_CONSTRAINTS), {
    message: tv("validation.technicalConstraints.required"),
  }),
});

// ============ Machines ============
export const machineConfigSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["washer", "dryer"]),
  capacityKg: z.number().min(3, tv("validation.machines.capacity")),
  count: z.number().int().min(1, tv("validation.machines.count")),
  price: z.number().min(0.5, tv("validation.machines.price")),
  cyclesPerDay: z.number().min(1, tv("validation.machines.cyclesPerDay")),
});

export const washersSchema = z.object({
  machines: z
    .array(machineConfigSchema)
    .min(1, tv("validation.machines.minWasher"))
});

export const dryersSchema = z.object({
  machines: z
    .array(machineConfigSchema)
    .min(1, tv("validation.machines.minDryer"))
});

export const machinesSchema = z.object({
  machines: z
    .array(machineConfigSchema)
    .refine(
      (machines) => (
        machines.some(machine => machine.type === "washer")
        && machines.some(machine => machine.type === "dryer")
      ),
      {
        message: tv("validation.machines.minBoth")
      }
    )
});

// ============ Revenues ============
export const revenuesSchema = z.object({
  washingRevenue: z.number().optional(),
  dryingRevenue: z.number().optional(),
  totalRevenue: z.number().optional(),
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
  label: z.string().trim().min(1, tv("validation.costs.labelRequired")),
  amount: z.number().min(0, tv("validation.costs.invalidAmount")),
  category: fixedCostCategoryEnum,
});

const variableCostSchema = z.object({
  id: z.string().min(1),
  label: z.string().trim().min(1, tv("validation.costs.labelRequired")),
  percent: z.number().min(0, tv("validation.costs.invalidPercent")).max(100, tv("validation.costs.percentRange")),
  category: variableCostCategoryEnum,
});

export const chargesSchema = z.object({
  fixedCosts: z.array(fixedCostSchema),
  variableCosts: z.array(variableCostSchema).refine(
    (vCosts) => vCosts.reduce((sum, cost) => sum + (cost.percent ?? 0), 0) <= 100,
    { message: tv("validation.costs.variableOverflow"), path: ["variableCosts"] },
  ),
});

// ============ Global ============
export const simulatorProjectSchema = projectInfoSchema
  .merge(localConstraintsSchema)
  .merge(machinesSchema)
  .merge(chargesSchema)
  .merge(revenuesSchema);

export type SimulatorProjectInput = z.infer<typeof simulatorProjectSchema>;

export const sectionSchemas = {
  projectInfo: projectInfoSchema,
  localConstraints: localConstraintsSchema,
  dryers: dryersSchema,
  washers: washersSchema,
  charges: chargesSchema,
  revenues: revenuesSchema,
} as const;

export type SimulatorValidationSection = keyof typeof sectionSchemas;
