import type { FixedCostItem, VariableCostItem } from "@/types/simulator.types";

// Fonctions pour les coûts fixes
export function updateFixedCost(
  items: FixedCostItem[] | undefined,
  id: string,
  label?: string,
  amount?: number,
): FixedCostItem[] {
  return (items ?? []).map((c) => (c.id === id ? { ...c, label, amount } : c));
}

export function removeFixedCost(items: FixedCostItem[] | undefined, id: string): FixedCostItem[] {
  return (items ?? []).filter((c) => c.id !== id);
}

export function addFixedCost(
  items: FixedCostItem[] | undefined,
  itemLabel: string,
  itemCategory: FixedCostItem["category"],
  itemAmount: number
): FixedCostItem[] {
  return [
    ...(items ?? []),
    { id: crypto.randomUUID(), label: itemLabel, amount: itemAmount, category: itemCategory },
  ];
}

// Fonctions pour les coûts variables
export function updateVariableCost(
  items: VariableCostItem[] | undefined,
  id: string,
  label?: string,
  percent?: number,
): VariableCostItem[] {
  return (items ?? []).map((c) => (c.id === id ? { ...c, label, percent } : c));
}

export function removeVariableCost(items: VariableCostItem[] | undefined, id: string): VariableCostItem[] {
  return (items ?? []).filter((c) => c.id !== id);
}

export function addVariableCost(
  items: VariableCostItem[] | undefined,
  itemLabel: string,
  itemCategory: VariableCostItem["category"],
  itemPercent: number
): VariableCostItem[] {
  return [
    ...(items ?? []),
    { id: crypto.randomUUID(), label: itemLabel, percent: itemPercent, category: itemCategory },
  ];
}
