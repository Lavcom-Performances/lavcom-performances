import { FormCard, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/form-card";
import { Building2 } from "lucide-react";
import { ProjectIdentityCard } from "./ProjectIdentityCard";
import { LocationCard } from "./LocationCard";
import { OpeningHoursCard } from "./OpeningHoursCard";
import type { ProjectLocationState } from "./ProjectInfoForm";

interface Props {
  projectLocation: ProjectLocationState;
  onProjectLocationChange: (next: ProjectLocationState) => void;
}

export function ProjectDetailsCard({ projectLocation, onProjectLocationChange }: Props) {
  return (
    <FormCard>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          Détails du projet
        </CardTitle>
        <CardDescription>Ces informations nous aideront à personnaliser votre simulation</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <ProjectIdentityCard />
        <LocationCard
          projectLocation={projectLocation}
          onProjectLocationChange={onProjectLocationChange}
        />
        <OpeningHoursCard />
      </CardContent>
    </FormCard>
  );
}
