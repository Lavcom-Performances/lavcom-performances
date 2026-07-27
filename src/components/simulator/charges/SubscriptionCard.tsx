import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CostRow } from "./CostRow";
import { FixedCostItem } from "@/types/simulator.types";

interface SubscriptionProps {
  subscriptions: FixedCostItem[];
  onAdd: () => void;
  onChangeLabel: (id: string, label: string, value: number) => void;
  onChangeValue: (id: string, label: string, value: number) => void;
  onRemove: (id: string) => void;
}

export function SubscriptionCard({
  subscriptions,
  onAdd,
  onChangeLabel,
  onChangeValue,
  onRemove
}: SubscriptionProps) {
  return (
    <div className="space-y-4">
      <h4 className="text-base font-bold text-foreground">
        Abonnements
      </h4>
        {subscriptions.map((subscription) => (
          <CostRow
            key={subscription.id}
            label={subscription.label}
            subscription={true}
            value={subscription.amount}
            suffix="€/mois"
            placeholder="0"
            onChangeLabel={(label) => onChangeLabel(subscription.id, label, subscription.amount)}
            onChangeValue={(value) => onChangeValue(subscription.id, subscription.label, value)}
            onRemove={() => onRemove(subscription.id)}
          />
        ))}
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={onAdd}
      >
        <Plus className="h-4 w-4" />
        Ajouter un abonnement
      </Button>
    </div>
  );
}