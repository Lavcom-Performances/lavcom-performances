import type { SimulationProject } from "@/types/simulator.types";
import type {
  LocalShapeValue,
  StructuralObstacleValue
} from "@/types/simulatorFormOptions.types";

const LOCAL_SHAPE_FACTORS: Record<LocalShapeValue, number> = {
  rectangular: 1.0,
  narrow: 0.85,
  "l-shape": 0.8,
  corner: 0.8,
  unknown: 1.0,
};

const STRUCTURAL_OBSTACLE_FACTORS: Record<StructuralObstacleValue, number> = {
  none: 1.0,
  few: 0.9,
  many: 0.8,
  unknown: 1.0,
};

/**
 * Calculates the maximum estimated number of machines that can fit in the local.
 * Formula: usable area (surface * 0.7) / 3.5 (m² per machine) * shape factor * obstacle factor
 * @param project - The simulation project containing local configuration
 * @returns The maximum estimated number of machines that can fit
 */
export function calculateMaxMachinesEstimate(project: Partial<SimulationProject>): number {
  const surface = project.surface ?? 0;
  if (surface <= 0) return 0;

  const usableArea = surface * 0.7;
  const shapeFactor = LOCAL_SHAPE_FACTORS[project.localShape ?? "unknown"] ?? 1.0;
  const obstacleFactor = STRUCTURAL_OBSTACLE_FACTORS[project.structuralObstacles ?? "unknown"] ?? 1.0;

  const baseCapacity = usableArea / 3.5; // 3.5 m² per machine on average
  return Math.floor(baseCapacity * shapeFactor * obstacleFactor);
}

/**
 * Calculates the total number of machines configured by the user.
 * @param project - The simulation project containing machine configurations
 * @returns The total count of all machines (washers + dryers)
 */
export function getTotalUserMachines(project: Partial<SimulationProject>): number {
  return (project.machines ?? []).reduce((sum, machine) => sum + (machine.count ?? 0), 0);
}

/**
 * Checks if the project contains large washing machines (>= 18 kg).
 * @param project - The simulation project to check
 * @returns true if at least one large washer (>= 18kg) with count > 0 is present
 */
export function hasLargeWashers(project: Partial<SimulationProject>): boolean {
  return (project.machines ?? []).some(
    (machine) => machine.type === "washer" && (machine.capacityKg ?? 0) >= 18 && (machine.count ?? 0) > 0
  );
}

interface CapacityWarring {
  maxMachinesEstimate: number;
  userTotalMachines: number;
  isCapacityWarning: boolean;
}

/**
 * Checks if a capacity warning should be displayed and returns capacity calculation details.
 * A warning is shown when user has configured more machines than the local can reasonably fit.
 * @param project - The simulation project to check
 * @returns Object containing maxMachinesEstimate, userTotalMachines, and isCapacityWarning boolean
 */
export function showCapacityWarning(
  project: Partial<SimulationProject>
): CapacityWarring {
  const maxMachinesEstimate = calculateMaxMachinesEstimate(project);
  const userTotalMachines = getTotalUserMachines(project);
  const isCapacityWarning = maxMachinesEstimate > 0 && userTotalMachines > maxMachinesEstimate;
  return { maxMachinesEstimate, userTotalMachines, isCapacityWarning };
}
