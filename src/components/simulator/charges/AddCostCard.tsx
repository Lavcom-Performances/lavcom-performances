import {
  FIXED_COST_CATEGORIES,
  VARIABLE_COST_CATEGORIES
} from "@/config/simulatorFormOptions";
import {
  FixedCostItem,
  VariableCostItem,
  FixedCostCategory,
  VariableCostCategory
} from "@/types/simulator.types";
import { AddCostButton } from "./AddCostButton";
import { useSimulatorProjectContext } from "@/contexts/SimulatorProjectContext";

interface AddCostCardProps {
  costType: "fixed" | "variable";
}

type FixedCostsEntry = [
    string,
    { label: string; category: FixedCostItem["category"] }
  ];

type VariablesCostsEntry = [
    string,
    { label: string; category: VariableCostItem["category"] }
  ];

type FixedCostsEntries = FixedCostsEntry[];

type VariablesCostsEntries = VariablesCostsEntry[];

export function AddCostCard({ costType }: AddCostCardProps) {
  const { project } = useSimulatorProjectContext();

  const addedCategories = costType === "fixed"
    ? (project.fixedCosts ?? []).map(cost => cost.label)
    : (project.variableCosts ?? []).map(cost => cost.label);

  const getSelectableCosts = (
    costCategory: FixedCostCategory | VariableCostCategory
  ): Partial<FixedCostCategory> | Partial<VariableCostCategory> => {
    const selectableCosts = {};
    for (let cat in costCategory) {
      if (!addedCategories.find(label => costCategory[cat].label === label)) {
        selectableCosts[cat] = costCategory[cat]
      };
    }
    return selectableCosts;
  };

  const availableCosts: FixedCostsEntries | VariablesCostsEntries = costType === "fixed"
    ? Object.entries(getSelectableCosts(FIXED_COST_CATEGORIES))
    : Object.entries(getSelectableCosts(VARIABLE_COST_CATEGORIES));

  return (
    <div className="space-y-4">
      <span className="text-sm font-bold text-foreground">
        Ajouter une charge {costType === "fixed" ? "fixe" : "variable"}
      </span>
      <div className="flex gap-1 flex-wrap">
        {availableCosts.map((cost: FixedCostsEntry | VariablesCostsEntry, index: number) => (
          <AddCostButton 
            key={index}
            cost={cost}
            costType={costType}
          />
        ))}
      </div>
    </div>
  );
}
