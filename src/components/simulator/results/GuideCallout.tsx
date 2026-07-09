import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";

export function GuideCallout() {
  return (
    <Card className="border-orange-500/40 bg-orange-50/40 dark:bg-orange-950/10">
      <CardContent className="flex flex-col items-start gap-4 p-6 md:flex-row md:items-center">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-orange-500/10">
          <BookOpen className="h-6 w-6 text-orange-600" />
        </div>
        <div className="flex-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-orange-600">
            Ressource indispensable
          </div>
          <h4 className="mt-1 font-display text-lg font-bold text-foreground">
            Avant d'ouvrir : le guide du futur exploitant
          </h4>
          <p className="mt-1 text-sm text-muted-foreground">
            Ne lancez pas votre projet sans ce guide. Étude de zone en 6 points, grilles d'audit
            local, budget CAPEX/OPEX détaillé, check-list "Prêt à ouvrir"… Tout ce que les banques
            et installateurs attendent de vous.
          </p>
          <div className="mt-1 text-xs italic text-muted-foreground">
            Collection Laverie Pro by Lavcom
          </div>
        </div>
        <Button className="bg-orange-500 text-white hover:bg-orange-600">
          Découvrir le guide
        </Button>
      </CardContent>
    </Card>
  );
}
