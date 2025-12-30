import { useMemo } from "react";
import { SimulationProject } from "@/types/simulation";

export interface ValidationErrors {
  name?: string;
  city?: string;
  zone_type?: string;
  surface_m2?: string;
  opening_hours_description?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationErrors;
  errorCount: number;
}

export function useSimulationValidation(project: SimulationProject): ValidationResult {
  return useMemo(() => {
    const errors: ValidationErrors = {};

    // Nom du projet (obligatoire, min 3 caractères)
    if (!project.name || project.name.trim().length < 3) {
      errors.name = "Le nom du projet est requis (min. 3 caractères)";
    }

    // Ville (obligatoire)
    if (!project.city || project.city.trim().length === 0) {
      errors.city = "La ville est requise";
    }

    // Type de zone (obligatoire)
    if (!project.zone_type) {
      errors.zone_type = "Le type de zone est requis";
    }

    // Surface (obligatoire, > 10m²)
    if (!project.surface_m2 || project.surface_m2 < 10) {
      errors.surface_m2 = "La surface est requise (min. 10 m²)";
    }

    // Horaires (obligatoire)
    if (!project.opening_hours_description || project.opening_hours_description.trim().length === 0) {
      errors.opening_hours_description = "Les horaires d'ouverture sont requis";
    }

    const errorCount = Object.keys(errors).length;

    return {
      isValid: errorCount === 0,
      errors,
      errorCount,
    };
  }, [project]);
}
