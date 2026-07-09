import { FormCard, CardContent, CardHeader, CardTitle } from "@/components/ui/form-card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { MapPin, Pencil } from "lucide-react";
import { MOCK_PROJECT } from "@/components/simulator/mockData";

export function ResultsSummaryCard() {
  return (
    <FormCard className="">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MapPin className="h-5 w-5 text-primary" />
          Résumé du projet
        </CardTitle>
        <Button variant="ghost" size="sm" asChild className="gap-2 text-xs">
          <Link to="/simulator/project">
            <Pencil className="h-3.5 w-3.5" />
            Modifier les infos
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm md:grid-cols-2">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Ville</div>
          <div className="font-medium text-foreground">
            {MOCK_PROJECT.city} ({MOCK_PROJECT.zip})
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Surface</div>
          <div className="font-medium text-foreground">{MOCK_PROJECT.surfaceM2} m²</div>
        </div>
        <div className="md:col-span-2">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            Équipements
          </div>
          <div className="font-medium text-foreground">5 lave-linge, 3 sèche-linge</div>
        </div>
      </CardContent>
    </FormCard>
  );
}
