import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2 } from "lucide-react";
import { ProjectIdentityCard } from "./ProjectIdentityCard";
import { LocationCard } from "./LocationCard";
import { OpeningHoursCard } from "./OpeningHoursCard";

export function ProjectDetailsCard() {
  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-heading text-2xl font-bold tracking-tight text-foreground">
          <Building2 className="h-5 w-5 text-primary" />
          Détails du projet
        </CardTitle>
        <CardDescription>Ces informations nous aideront à personnaliser votre simulation</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <ProjectIdentityCard />
        <LocationCard />
        <OpeningHoursCard />
      </CardContent>
    </Card>
  );
}
