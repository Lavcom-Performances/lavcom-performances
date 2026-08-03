import { createContext, useContext, type ReactNode } from "react";
import type { SimulatorProjectInput, SimulatorValidationSection } from "@/lib/validation/simulatorProjectSchema";
import type { ValidationResult } from "@/hooks/useSimulatorValidation";

type FieldError = (name: keyof SimulatorProjectInput | SimulatorValidationSection) => string | undefined;

interface SimulatorStepContextValue {
  fieldError: FieldError;
  sections: ValidationResult["sections"];
  errors: ValidationResult["errors"];
}

const SimulatorStepContext = createContext<SimulatorStepContextValue | null>(null);

export function SimulatorStepProvider({
  value,
  children,
}: {
  value: SimulatorStepContextValue;
  children: ReactNode;
}) {
  return (
    <SimulatorStepContext.Provider value={value}>{children}</SimulatorStepContext.Provider>
  );
}

const noopFieldError: FieldError = () => undefined;

export function useSimulatorStepErrors(): SimulatorStepContextValue {
  const ctx = useContext(SimulatorStepContext);
  if (!ctx) {
    throw new Error("useSimulatorStepErrors must be used within SimulatorStepProvider");
  }
  return ctx;
}
