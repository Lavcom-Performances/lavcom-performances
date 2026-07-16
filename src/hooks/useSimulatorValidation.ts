import { useMemo } from "react";
import { useSimulatorProjectContext } from "@/contexts/SimulatorProjectContext";
import {
  sectionSchemas,
  simulatorProjectSchema,
  type SimulatorProjectInput,
  type SimulatorValidationSection,
} from "@/lib/validation/simulatorProjectSchema";

export type ValidationErrors = Partial<Record<keyof SimulatorProjectInput, string>>;

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
      out[key as keyof SimulatorProjectInput] = messages[0];
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
    const errorCount = Object.keys(errors).length;

    const sections = (Object.keys(sectionSchemas) as SimulatorValidationSection[]).reduce(
      (acc, key) => {
        const sectionResult = sectionSchemas[key].safeParse(project);
        if (sectionResult.success) {
          acc[key] = { isValid: true, errorCount: 0 };
        } else {
          const fieldErrors = sectionResult.error.flatten().fieldErrors;
          const count = Object.values(fieldErrors).filter(
            (msgs) => msgs && msgs.length > 0,
          ).length;
          acc[key] = { isValid: count === 0, errorCount: count };
        }
        return acc;
      },
      {} as Record<SimulatorValidationSection, ValidationSectionResult>,
    );

    return {
      isValid: result.success,
      errors,
      errorCount,
      sections,
    };
  }, [project]);
}
