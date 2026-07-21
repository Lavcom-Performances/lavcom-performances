import type { MachineConfig } from "@/types/simulator.types";

const DAYS_PER_MONTH = 30;

/**
 * Calculates the monthly revenue for a single machine
 * @param machine - The machine configuration
 * @returns The monthly revenue in euros
 */
export function machineMonthlyRevenue(machine: MachineConfig): number {
  return machine.count * machine.cyclesPerDay * machine.price * DAYS_PER_MONTH;
}

/**
 * Calculates the total monthly revenue for a specific machine type (washing or drying)
 * @param machines - List of all machines
 * @param type - The machine type ('washer' for washing, 'dryer' for drying)
 * @returns The total monthly revenue for this machine type
 */
export function calculateCategoryRevenue(
  machines: MachineConfig[] | undefined,
  type: "washer" | "dryer"
): number {
  const filteredMachines = (machines ?? []).filter((machine) => machine.type === type);
  return filteredMachines.reduce((sum, machine) => sum + machineMonthlyRevenue(machine), 0);
}

/**
 * Calculates all revenue figures (washing, drying, total) from machines
 * @param machines - List of all machines
 * @returns An object containing washingRevenue, dryingRevenue, and totalRevenue
 */
export function calculateRevenueBreakdown(machines: MachineConfig[] | undefined) {
  const washingRevenue = calculateCategoryRevenue(machines, "washer");
  const dryingRevenue = calculateCategoryRevenue(machines, "dryer");
  const totalRevenue = washingRevenue + dryingRevenue;

  return {
    washingRevenue,
    dryingRevenue,
    totalRevenue,
  };
}

/**
 * Updates a machine in the list by its ID
 * @param machines - List of machines to update
 * @param id - The ID of the machine to update
 * @param patch - Partial machine data to apply
 * @returns Updated list of machines
 */
export function updateMachineList(
  machines: MachineConfig[] | undefined,
  id: string,
  patchedConfig: Partial<MachineConfig>,
): MachineConfig[] {
  return (machines ?? []).map((machine) => (machine.id === id ? { ...machine, ...patchedConfig } : machine));
}

/**
 * Removes a machine from the list by its ID
 * @param machines - List of machines
 * @param id - The ID of the machine to remove
 * @returns List of machines without the removed machine
 */
export function removeMachine(machines: MachineConfig[] | undefined, id: string): MachineConfig[] {
  return (machines ?? []).filter((machine) => machine.id !== id);
}

/**
 * Adds a new machine with default values to the list
 * @param machines - Current list of machines
 * @param type - The type of machine to add ('washer' or 'dryer')
 * @returns List of machines with the new machine added
 */
export function addMachine(
  machines: MachineConfig[] | undefined,
  type: "washer" | "dryer",
): MachineConfig[] {
  const defaults: MachineConfig =
    type === "washer"
      ? { id: crypto.randomUUID(), type, capacityKg: 7, count: 1, price: 5.5, cyclesPerDay: 4 }
      : { id: crypto.randomUUID(), type, capacityKg: 13, count: 1, price: 2, cyclesPerDay: 4 };
  return [...(machines ?? []), defaults];
}
