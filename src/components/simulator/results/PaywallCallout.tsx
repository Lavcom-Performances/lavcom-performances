import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { PackChoiceCard } from "./PackChoiceCard";
import { MOCK_PACKS } from "@/components/simulator/mockData";

export function PaywallCallout() {
  return (
    <Card className="border-primary/40 bg-gradient-to-br from-primary/10 via-background to-background">
      <CardContent className="space-y-6 p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <div className="space-y-2">
          <h3 className="font-display text-2xl font-bold text-foreground">
            Débloquez l'analyse complète de votre projet
          </h3>
          <p className="mx-auto max-w-xl text-sm text-muted-foreground">
            Pour avoir accès à l'analyse complète de votre projet, choisissez la formule qui vous
            correspond.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {MOCK_PACKS.map((p) => (
            <PackChoiceCard key={p.id} {...p} />
          ))}
        </div>

        <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
          Découvrir les formules
        </Button>
      </CardContent>
    </Card>
  );
}
