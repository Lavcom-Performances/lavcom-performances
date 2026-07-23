import type { SimulationProject, FixedCostItem, VariableCostItem } from "@/types/simulator.types";

export interface SimulatorChargesFormProps {
  project: Partial<SimulationProject>;
  onUpdate: (updates: Partial<SimulationProject>) => void;
}

export function updateFixedCost(
  items: FixedCostItem[] | undefined,
  id: string,
  amount: number,
): FixedCostItem[] {
  return (items ?? []).map((c) => (c.id === id ? { ...c, amount } : c));
}

export function removeFixedCost(items: FixedCostItem[] | undefined, id: string): FixedCostItem[] {
  return (items ?? []).filter((c) => c.id !== id);
}

export function addFixedCost(items: FixedCostItem[] | undefined, itemLabel: string): FixedCostItem[] {
  return [
    ...(items ?? []),
    { id: crypto.randomUUID(), label: itemLabel, amount: 0, category: "other" },
  ];
}

export function updateVariableCost(
  items: VariableCostItem[] | undefined,
  id: string,
  percent: number,
): VariableCostItem[] {
  return (items ?? []).map((c) => (c.id === id ? { ...c, percent } : c));
}

export function removeVariableCost(items: VariableCostItem[] | undefined, id: string): VariableCostItem[] {
  return (items ?? []).filter((c) => c.id !== id);
}

export function addVariableCost(items: VariableCostItem[] | undefined, itemLabel: string): VariableCostItem[] {
  return [
    ...(items ?? []),
    { id: crypto.randomUUID(), label: itemLabel, percent: 0, category: "other" },
  ];
}
