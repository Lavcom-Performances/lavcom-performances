import { useState, useEffect, useCallback } from "react";
import { SimulationProject, defaultSimulationProject } from "@/types/simulation";

const STORAGE_KEY = "lavcom_simulation_project";

export function useSimulationProject() {
  const [project, setProject] = useState<SimulationProject>(() => {
    // Initialiser depuis localStorage si disponible
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Fusionner avec les valeurs par défaut pour gérer les nouvelles propriétés
          return { ...defaultSimulationProject, ...parsed };
        } catch {
          return defaultSimulationProject;
        }
      }
    }
    return defaultSimulationProject;
  });

  const [isLoaded, setIsLoaded] = useState(false);

  // Sauvegarder dans localStorage à chaque changement
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
    }
  }, [project, isLoaded]);

  // Marquer comme chargé après le premier rendu
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
