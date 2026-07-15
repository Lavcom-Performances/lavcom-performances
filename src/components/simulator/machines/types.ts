import type { SimulationProject, MachineConfig } from "@/types/simulator.types";

export interface SimulatorMachinesFormProps {
  project: Partial<SimulationProject>;
  onUpdate: (updates: Partial<SimulationProject>) => void;
}

const DAYS_PER_MONTH = 30;

export function machineMonthlyRevenue(m: MachineConfig): number {
  return m.count * m.cycles_day * m.price * DAYS_PER_MONTH;
}

export function updateMachineList(
  machines: MachineConfig[] | undefined,
  id: string,
  patch: Partial<MachineConfig>,
): MachineConfig[] {
  return (machines ?? []).map((m) => (m.id === id ? { ...m, ...patch } : m));
}

export function removeMachine(machines: MachineConfig[] | undefined, id: string): MachineConfig[] {
  return (machines ?? []).filter((m) => m.id !== id);
}

export function addMachine(
  machines: MachineConfig[] | undefined,
  type: "washer" | "dryer",
): MachineConfig[] {
  const defaults: MachineConfig =
    type === "washer"
      ? { id: crypto.randomUUID(), type, capacity_kg: 10, count: 1, price: 7, cycles_day: 3 }
      : { id: crypto.randomUUID(), type, capacity_kg: 14, count: 1, price: 2, cycles_day: 5 };
  return [...(machines ?? []), defaults];
}
