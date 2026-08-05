import { FormCard, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/form-card";
import { Separator } from "@/components/ui/separator";
import { LucideIcon, Info } from "lucide-react";
import { CostRow } from "./CostRow";
import { AddCostCard } from "./AddCostCard";
import { SubscriptionCard } from "./SubscriptionCard"
import {
  addFixedCost,
  removeFixedCost,
  updateFixedCost,
  addVariableCost,
  removeVariableCost,
  updateVariableCost,
} from "./types";
import { useSimulatorProjectContext } from "@/contexts/SimulatorProjectContext";
import { FixedCostItem, VariableCostItem } from "@/types/simulator.types";
import { useTranslation } from "react-i18next";

interface CostsCardProps {
  icon: LucideIcon;
  cardTitle: string;
  cardDescription: string;
  costType: "fixed" | "variable";
  showHint?: boolean;
  width: string;
}

export function CostsCard({
  icon: Icon,
  cardTitle,
  cardDescription,
  costType,
  showHint = false,
  width,
}: CostsCardProps) {
  const { t } = useTranslation("paid-simulator");
  const { project, updateProject } = useSimulatorProjectContext();
  const items: FixedCostItem[] | VariableCostItem[] = costType === "fixed" ? project.fixedCosts ?? [] : project.variableCosts ?? [];
  
  const getTotal = () => {
    if (costType === "fixed") {
      return items.reduce((sum: number, cost: FixedCostItem) => sum + (cost.amount || 0), 0);
    } else {
      return items.reduce((sum: number, cost: VariableCostItem) => sum + (cost.percent || 0), 0);
    }
  };

  const getSubscriptions = () => {
    return costType === "fixed"
      ? (items as FixedCostItem[]).filter((item) => item.category === "subscription")
      : [];
  };

  const subscriptions = getSubscriptions();

  const total = getTotal();

  const handleAdd = (
    newCost: string,
    category: FixedCostItem["category"] | VariableCostItem["category"]
  ) => {
    if (costType === "fixed") {
      updateProject({
        fixedCosts: addFixedCost(
          project.fixedCosts,
          newCost,
          category as FixedCostItem["category"]
        )
      });
    } else {
      updateProject({
        variableCosts: addVariableCost(
          project.variableCosts,
          newCost,
          category as VariableCostItem["category"]
        )
      });
    }
  };

  const handleUpdate = (id: string, label?: string, value?: number,) => {
    if (costType === "fixed") {
      updateProject({ fixedCosts: updateFixedCost(project.fixedCosts, id, label, value) });
    } else {
      updateProject({ variableCosts: updateVariableCost(project.variableCosts, id, label, value) });
    }
  };

  const handleRemove = (id: string) => {
    if (costType === "fixed") {
      updateProject({ fixedCosts: removeFixedCost(project.fixedCosts, id) });
    } else {
      updateProject({ variableCosts: removeVariableCost(project.variableCosts, id) });
    }
  };

  return (
    <FormCard className={width}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className="h-5 w-5 text-lavcom-orange" />
          {cardTitle}
        </CardTitle>
        <CardDescription>{cardDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormCard className="border-border bg-muted/20">
          <CardContent className="flex flex-col gap-4 p-4">
            <h4 className="text-base font-bold text-foreground">{t("charges.sectionTitle")}</h4>
            {costType === "fixed"
              ? (items as FixedCostItem[])
                .filter((cost) => cost.category !== "subscription")
                .map((cost) => (
                  <CostRow
                    key={cost.id}
                    label={cost.label}
                    other={cost.category === "other"}
                    value={cost.amount ?? 0}
                    suffix={t("common.euroPerMonth")}
                    placeholder="0"
                    onChangeLabel={(label) => handleUpdate(cost.id, label, cost.amount)}
                    onChangeValue={(value) => handleUpdate(cost.id, cost.label, value)}
                    onRemove={() => handleRemove(cost.id)}
                  />))
              : (items as VariableCostItem[]).map((cost) => (
                <CostRow
                  key={cost.id}
                  label={cost.label}
                  other={cost.category === "other"}
                  value={cost.percent ?? 0}
                  suffix={t("common.percentOfRevenue")}
                  placeholder="0"
                  onChangeLabel={(label) => handleUpdate(cost.id, label, cost.percent)}
                  onChangeValue={(value) => handleUpdate(cost.id, cost.label, value)}
                  onRemove={() => handleRemove(cost.id)}
                />))
            }
            <Separator />
            <AddCostCard
              costType={costType}     
            />
          </CardContent>
        </FormCard>
        {costType === "fixed" && (
          <FormCard className="border-border bg-muted/20">
            <CardContent className="flex flex-col gap-4 p-4">
              <SubscriptionCard
                subscriptions={subscriptions}
                onAdd={() => handleAdd("", "subscription")}
                onChangeLabel={(id, label, value) => handleUpdate(id, label, value)}
                onChangeValue={(id, label, value) => handleUpdate(id, label, value)}
                onRemove={(id) => handleRemove(id)}
              />
            </CardContent>
          </FormCard>
        )}
        <div className="flex flex-col items-center rounded-lg border border-lavcom-orange/40 bg-lavcom-orange/20 px-4 py-3">
          <span className="text-xs font-medium text-muted-foreground">
            {costType === "fixed" ? t("charges.fixed.total") : t("charges.variable.total")}
          </span>
          <span className="text-lg font-bold text-lavcom-orange">
            {costType === "fixed" 
              ? `${total.toLocaleString("fr-FR")} €` 
              : `${total.toFixed(1)} %`
            }
            {costType === "fixed" && (
              <span className="ml-1 text-xs font-normal text-muted-foreground">{t("common.perMonth")}</span>
            )}
            {costType === "variable" && (
              <span className="ml-1 text-xs font-normal text-muted-foreground">{t("common.ofRevenue")}</span>
            )}
          </span>
        </div>
        {showHint && costType === "variable" && (
          <div className="inline-flex items-start justify-start gap-1 rounded-md border border-input bg-background p-3">
            <Info className="mt-0.5 h-3 w-3s shrink-0 text-muted-foreground"/>
            <p className="text-xs text-muted-foreground">
              {t("charges.variable.hint")}
            </p>
          </div>
        )}
      </CardContent>
    </FormCard>
  );
}
