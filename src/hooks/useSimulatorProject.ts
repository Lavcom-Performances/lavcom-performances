import { useState, useEffect, useCallback } from "react";
import { SimulationProject, defaultMachines, defaultFixedCosts, defaultVariableCosts } from "@/types/simulator.types";

const STORAGE_KEY = "simulationProject";

// Default values ​​for a new project (pre-filled with indicative values)
const defaultSimulationProject: Partial<SimulationProject> = {
  scenarioName: "Scénario 1",
  country: "fr",
  localShape: "unknown",
  structuralObstacles: "unknown",
  doorWidth: 90,
  canModifyFacade: "unknown",
  technicalConstraints: "unknown",
  machines: [...defaultMachines],
  fixedCosts: [...defaultFixedCosts],
  variableCosts: [...defaultVariableCosts],
};

export function useSimulationProject() {
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
    console.log('[DEBUG] updateProject called with:', updates);
    console.log('[DEBUG] Current project before update:', project);
    setProject(prev => {
      const updated = { ...prev, ...updates };
      console.log('[DEBUG] Project after update:', updated);
      return updated;
    });
  }, [project]);

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
