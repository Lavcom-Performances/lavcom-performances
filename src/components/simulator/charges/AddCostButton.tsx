import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useSimulatorProjectContext } from "@/contexts/SimulatorProjectContext";
import { FixedCostItem, VariableCostItem } from "@/types/simulator.types";
import { DEFAULT_FIXED_COSTS, DEFAULT_VARIABLE_COSTS } from "@/config/simulatorFormOptions";
import { Plus } from "lucide-react";
import { addFixedCost, addVariableCost } from "./types";

interface AddCostButtonProps {
  cost: [
    string,
    { 
      label: string;
      category: FixedCostItem["category"] | VariableCostItem["category"]
    }
  ];
  costType: "fixed" | "variable";      
};

export function AddCostButton({ cost, costType }: AddCostButtonProps) {
  const { t } = useTranslation("paid-simulator");
  const { project, updateProject } = useSimulatorProjectContext();
  const handleAdd = (
    newCost: string,
    category: FixedCostItem["category"] | VariableCostItem["category"]
  ) => {
    if (costType === "fixed") {
      updateProject({
        fixedCosts: addFixedCost(
          project.fixedCosts,
          newCost,
          category as FixedCostItem["category"],
          DEFAULT_FIXED_COSTS.find(cost => cost.label === newCost)?.amount ?? 0,
        )
      });
    } else {
      updateProject({
        variableCosts: addVariableCost(
          project.variableCosts,
          newCost,
          category as VariableCostItem["category"],
          DEFAULT_VARIABLE_COSTS.find(cost => cost.label === newCost)?.percent ?? 0,
        )
      });
    }
  };

  return (
    <>
      <Button
        key={cost[0]}
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => {
          handleAdd(
            cost[1].category !== "other" ? cost[1].label : "",
            cost[1].category
          );
        }}
      >
        <Plus className="h-4 w-4" />
        {t(`options.${costType}CostCategories.${cost[0]}`)}
      </Button>
    </>
  );
}
