import type { SimulationProject } from "@/types/simulator.types";

export interface SimulatorProjectFormProps {
  project: Partial<SimulationProject>;
  onUpdate: (updates: Partial<SimulationProject>) => void;
}
