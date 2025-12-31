import { Upload } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export function DashboardEmptyState() {
  return (
    <EmptyState
      icon={Upload}
      benefits={[
        "Votre tableau de bord s'actualise automatiquement après chaque import.",
        "Visualisez vos revenus, transactions et tendances en temps réel.",
      ]}
    />
  );
}
