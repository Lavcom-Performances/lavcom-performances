import { useState, useEffect, useCallback } from "react";
import { SimulationProject, defaultMachines, defaultFixedCosts, defaultVariableCosts } from "@/types/simulator.types";

const STORAGE_KEY = "simulationProject";

// Default values for a new simulator project (pre-filled with indicative values)
const defaultSimulationProject: Partial<SimulationProject> = {
  projectName: "",
  scenarioName: "Scénario 1",
  country: "fr",
  address: "",
  city: "",
  postalCode: "",
  departmentCode: "",
  departmentName: "",
  region: "",
  zoneType: "",
  openingHours: {},
  openingDays: {},
  surface: 40,
  localShape: "unknown",
  structuralObstacles: "unknown",
  doorWidth: 90,
  canModifyFacade: "unknown",
  technicalConstraints: "unknown",
  machines: [...defaultMachines],
  fixedCosts: [...defaultFixedCosts],
  variableCosts: [...defaultVariableCosts],
};

export function useSimulatorProject() {
  const [project, setProject] = useState<Partial<SimulationProject>>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return { ...defaultSimulationProject, ...parsed };
        } catch {
          return defaultSimulationProject;
        }
      }
    }
    return defaultSimulationProject;
  });

  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
    }
  }, [project, isLoaded]);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const updateProject = useCallback((updates: Partial<SimulationProject>) => {
    setProject(prev => ({ ...prev, ...updates }));
  }, []);

  const resetProject = useCallback(() => {
    setProject(defaultSimulationProject);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const clearStorage = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    project,
    setProject,
    updateProject,
    resetProject,
    clearStorage,
    isLoaded,
  };
}
