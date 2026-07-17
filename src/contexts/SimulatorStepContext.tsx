import { createContext, useContext, type ReactNode } from "react";
import type { SimulatorProjectInput } from "@/lib/validation/simulatorProjectSchema";

type FieldError = (name: keyof SimulatorProjectInput) => string | undefined;

interface SimulatorStepContextValue {
  fieldError: FieldError;
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

export function useSimulatorStepErrors(): { fieldError: FieldError } {
  const ctx = useContext(SimulatorStepContext);
  return { fieldError: ctx?.fieldError ?? noopFieldError };
}
