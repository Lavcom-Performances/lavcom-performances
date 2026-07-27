
import { Button } from "@/components/ui/button";
import {
  FIXED_COST_CATEGORIES,
  VARIABLE_COST_CATEGORIES
} from "@/config/simulatorFormOptions";
import { FixedCostItem, VariableCostItem } from "@/types/simulator.types";
import { Plus } from "lucide-react";

type AddCostCardProps =
  | {
      costType: "fixed";
      onClick: (newCost: string, category: FixedCostItem["category"]) => void;
    }
  | {
      costType: "variable";
      onClick: (newCost: string, category: VariableCostItem["category"]) => void;
    };

export function AddCostCard({ costType, onClick }: AddCostCardProps) {
  const fixedCosts = Object.entries(FIXED_COST_CATEGORIES) as [
    string,
    { label: string; category: FixedCostItem["category"] }
  ][];
  const variableCosts = Object.entries(VARIABLE_COST_CATEGORIES) as [
    string,
    { label: string; category: VariableCostItem["category"] }
  ][];

  return (
    <div className="space-y-4">
      <h4 className="text-base font-bold text-foreground">
        Ajouter une charge {costType === "fixed" ? "fixe" : "variable"}
      </h4>
      <div className="flex gap-1 flex-wrap">
        {costType === "fixed"
          ? fixedCosts.map((cost) => (
              <Button
                key={cost[0]}
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => {
                  onClick(
                    cost[1].category !== "other" ? cost[1].label : "",
                    cost[1].category
                  );
                }}
              >
                <Plus className="h-4 w-4" />
                {cost[1].label}
              </Button>
            ))
          : variableCosts.map((cost) => (
              <Button
                key={cost[0]}
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => {
                  onClick(
                    cost[1].category !== "other" ? cost[1].label : "",
                    cost[1].category
                  );
                }}
              >
                <Plus className="h-4 w-4" />
                {cost[1].label}
              </Button>
            ))
        }
      </div>
    </div>
  );
}
