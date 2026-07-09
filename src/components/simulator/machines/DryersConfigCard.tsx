import { FormCard, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/form-card";
import { Button } from "@/components/ui/button";
import { Plus, Wind } from "lucide-react";
import { MachineCounter } from "./MachineCounter";
import { MOCK_DRYERS, MOCK_REVENUE } from "@/components/simulator/mockData";

export function DryersConfigCard() {
  return (
    <FormCard className="">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Wind className="h-5 w-5 text-primary" />
          Sèche-linge
        </CardTitle>
        <CardDescription>Configurez vos sèche-linge</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {MOCK_DRYERS.map((d) => (
          <MachineCounter key={d.id} {...d} />
        ))}
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Ajouter un sèche-linge
        </Button>
        <div className="flex items-center justify-between rounded-lg bg-primary/10 px-4 py-3">
          <span className="text-sm font-medium text-foreground">CA séchage estimé</span>
          <span className="text-lg font-bold text-primary">
            {MOCK_REVENUE.drying.toLocaleString("fr-FR")} € / mois
          </span>
        </div>
      </CardContent>
    </FormCard>
  );
}
