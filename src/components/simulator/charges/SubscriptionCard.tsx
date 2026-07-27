import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CostRow } from "./CostRow";
import { FixedCostItem } from "@/types/simulator.types";

interface SubscriptionProps {
  subscriptions: FixedCostItem[];
}

export function SubscriptionCard({ subscriptions }: SubscriptionProps) {
  return (
    <div className="space-y-4">
      <h4 className="text-base font-bold text-foreground">
        Abonnements
      </h4>
      <div>
        {subscriptions.map((subscription) => (
          <CostRow
            label={subscription.label}
            subscription={true}
            value={subscription.amount}
            suffix="€/mois"
            placeholder="0"
            onChangeValue={() => ""}
            onRemove={() => ""}
          />
        ))}
      </div>
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => ""}
      >
        <Plus className="h-4 w-4" />
        Ajouter un abonnement
      </Button>
    </div>
  );
}