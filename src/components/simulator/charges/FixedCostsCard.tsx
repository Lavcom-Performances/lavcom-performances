import { FormCard, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/form-card";
import { Button } from "@/components/ui/button";
import { Plus, Receipt } from "lucide-react";
import { CostRow } from "./CostRow";
import { MOCK_FIXED_COSTS, MOCK_FIXED_TOTAL } from "@/components/simulator/mockData";

export function FixedCostsCard() {
  return (
    <FormCard className="">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Receipt className="h-5 w-5 text-primary" />
          Charges fixes mensuelles
        </CardTitle>
        <CardDescription>Montants fixes à payer chaque mois</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {MOCK_FIXED_COSTS.map((c) => (
          <CostRow key={c.id} label={c.label} amount={c.amount || undefined} placeholder="0" />
        ))}
        <div className="border-t pt-4">
          <div className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">
            Abonnements
          </div>
          <CostRow label="Centrale de paiement" placeholder="Montant" />
          <div className="mt-3">
            <Button variant="ghost" size="sm" className="gap-2 text-primary">
              <Plus className="h-4 w-4" />
              Ajouter un abonnement
            </Button>
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Ajouter une charge fixe
        </Button>
        <div className="flex items-center justify-between rounded-lg bg-primary/10 px-4 py-3">
          <span className="text-sm font-medium text-foreground">Total charges fixes</span>
          <span className="text-lg font-bold text-primary">
            {MOCK_FIXED_TOTAL.toLocaleString("fr-FR")} €
            <span className="ml-1 text-sm font-normal text-muted-foreground">/ mois</span>
          </span>
        </div>
      </CardContent>
    </FormCard>
  );
}
