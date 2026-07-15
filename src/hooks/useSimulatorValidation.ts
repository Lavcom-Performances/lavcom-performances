import { useMemo } from "react";
import { SimulationProject } from "@/types/simulator.types";

export interface ValidationErrors {
  projectName?: string;
  city?: string;
  zoneType?: string;
  surface?: string;
  openingHours?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationErrors;
  errorCount: number;
}

export function useSimulationValidation(project: SimulationProject): ValidationResult {
  return useMemo(() => {
    const errors: ValidationErrors = {};

    if (!project.projectName || project.projectName.trim().length < 3) {
      errors.projectName = "Le nom du projet est requis (min. 3 caractères)";
    }

    if (!project.city || project.city.trim().length === 0) {
      errors.city = "La ville est requise";
    }

    if (!project.zoneType) {
      errors.zoneType = "Le type de zone est requis";
    }

    if (!project.surface || project.surface < 10) {
      errors.surface = "La surface est requise (min. 10 m²)";
    }

    if (!project.openingHours) {
      errors.openingHours = "Les horaires d'ouverture sont requis";
    }

    const errorCount = Object.keys(errors).length;

    console.log('[DEBUG] Validation - errors:', errors);

    return {
      isValid: errorCount === 0,
      errors,
      errorCount,
    };
  }, [project]);
}
