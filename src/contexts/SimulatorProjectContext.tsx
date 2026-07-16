import { createContext, useContext, ReactNode } from "react";
import { useSimulatorProject } from "@/hooks/useSimulatorProject";

type SimulatorProjectContextValue = ReturnType<typeof useSimulatorProject>;

const SimulatorProjectContext = createContext<SimulatorProjectContextValue | null>(null);

export function SimulatorProjectProvider({ children }: { children: ReactNode }) {
  const value = useSimulatorProject();
  return (
    <SimulatorProjectContext.Provider value={value}>
      {children}
    </SimulatorProjectContext.Provider>
  );
}

export function useSimulatorProjectContext(): SimulatorProjectContextValue {
  const ctx = useContext(SimulatorProjectContext);
  if (!ctx) {
    throw new Error(
      "useSimulatorProjectContext must be used within a <SimulatorProjectProvider>",
    );
  }
  return ctx;
}
