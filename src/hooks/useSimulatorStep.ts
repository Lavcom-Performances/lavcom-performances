import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useSimulatorValidation, type ValidationErrors } from "./useSimulatorValidation";
import type {
  SimulatorProjectInput,
  SimulatorValidationSection,
} from "@/lib/validation/simulatorProjectSchema";

interface Options {
  onInvalid?: (firstInvalid: SimulatorValidationSection) => void;
}

export interface UseSimulatorStepResult {
  guardNext: () => boolean;
  attempted: boolean;
  errors: ValidationErrors;
  sections: ReturnType<typeof useSimulatorValidation>["sections"];
  fieldError: (name: keyof SimulatorProjectInput | SimulatorValidationSection) => string | undefined;
}

export function useSimulatorStep(
  sections: SimulatorValidationSection[],
  options: Options = {},
): UseSimulatorStepResult {
  const validation = useSimulatorValidation();
  const [attempted, setAttempted] = useState(false);

  const guardNext = useCallback((): boolean => {
    const firstInvalid = sections.find((s) => !validation.sections[s].isValid);
    if (!firstInvalid) return true;

    setAttempted(true);

    const total = sections.reduce(
      (sum, s) => sum + validation.sections[s].errorCount,
      0,
    );
    toast.error(
      total <= 1
        ? "1 champ à corriger avant de continuer"
        : `${total} champs à corriger avant de continuer`,
    );

    options.onInvalid?.(firstInvalid);

    requestAnimationFrame(() => requestAnimationFrame(() => scrollToFirstError()));

    return false;
  }, [sections, validation, options]);

  const fieldError = useCallback(
    (name: keyof SimulatorProjectInput | SimulatorValidationSection) =>
      attempted ? validation.errors[name] : undefined,
    [attempted, validation.errors],
  );

  return {
    guardNext,
    attempted,
    errors: validation.errors,
    sections: validation.sections,
    fieldError,
  };
}
