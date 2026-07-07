import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, WashingMachine } from "lucide-react";
import { MachineCounter } from "./MachineCounter";
import { MOCK_WASHERS, MOCK_REVENUE } from "@/components/simulator/mockData";

export function WashersConfigCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <WashingMachine className="h-5 w-5 text-primary" />
          Lave-linge
        </CardTitle>
        <CardDescription>Configurez vos machines à laver</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {MOCK_WASHERS.map((w) => (
          <MachineCounter key={w.id} {...w} />
        ))}
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Ajouter un lave-linge
        </Button>
        <div className="flex items-center justify-between rounded-lg bg-primary/10 px-4 py-3">
          <span className="text-sm font-medium text-foreground">CA lavage estimé</span>
          <span className="text-lg font-bold text-primary">
            {MOCK_REVENUE.washing.toLocaleString("fr-FR")} € / mois
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
