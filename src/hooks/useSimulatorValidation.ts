import { useMemo } from "react";
import { useSimulatorProjectContext } from "@/contexts/SimulatorProjectContext";
import {
  sectionSchemas,
  simulatorProjectSchema,
  type SimulatorProjectInput,
  type SimulatorValidationSection,
} from "@/lib/validation/simulatorProjectSchema";

export type ValidationErrors = Partial<Record<keyof SimulatorProjectInput | SimulatorValidationSection, string>>;

export interface ValidationSectionResult {
  isValid: boolean;
  errorCount: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationErrors;
  errorCount: number;
  sections: Record<SimulatorValidationSection, ValidationSectionResult>;
}

function firstMessages(
  fieldErrors: Record<string, string[] | undefined>,
): ValidationErrors {
  const out: ValidationErrors = {};
  for (const [key, messages] of Object.entries(fieldErrors)) {
    if (messages && messages.length > 0) {
      out[key as keyof SimulatorProjectInput | SimulatorValidationSection] = messages[0];
    }
  }
  return out;
}

export function useSimulatorValidation(): ValidationResult {
  const { project } = useSimulatorProjectContext();

  return useMemo(() => {
    const result = simulatorProjectSchema.safeParse(project);
    const errors: ValidationErrors = result.success
      ? {}
      : firstMessages(result.error.flatten().fieldErrors);
    
    const sections = (Object.keys(sectionSchemas) as SimulatorValidationSection[]).reduce(
      (acc, section) => {
        const validationData = (() => {
          if (section === "washers") {
            return {
              ...project,
              machines: project.machines?.filter(machine => machine.type === "washer") ?? []
            };
          }
          if (section === "dryers") {
            return {
              ...project,
              machines: project.machines?.filter(machine => machine.type === "dryer") ?? []
            };
          }
          return project;
        })();

        const sectionResult = sectionSchemas[section].safeParse(validationData);
        if (sectionResult.success) {
          acc[section] = { isValid: true, errorCount: 0 };
        } else {
          const fieldErrors = sectionResult.error.flatten().fieldErrors;
          const count = Object.values(fieldErrors).filter(
            (messages) => messages && messages.length > 0,
          ).length;
          acc[section] = { isValid: count === 0, errorCount: count };
          
          const sectionError = fieldErrors[Object.keys(fieldErrors)[0]]?.[0];
          if (sectionError) {
            errors[section] = sectionError;
          }
        }
        return acc;
      },
      {} as Record<SimulatorValidationSection, ValidationSectionResult>,
    );
    
    const errorCount = Object.keys(errors).length;

    return {
      isValid: result.success && errorCount === 0,
      errors,
      errorCount,
      sections,
    };
  }, [project]);
}
