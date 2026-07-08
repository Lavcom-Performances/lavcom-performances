import { SectionHeading } from "@/components/simulator/layout/SectionHeading";
import { ProjectIdentityCard } from "./ProjectIdentityCard";
import { LocationCard } from "./LocationCard";
import { SurfaceHoursCard } from "./SurfaceHoursCard";

export function ProjectInfoForm() {
  return (
    <div className="space-y-8">
      <SectionHeading
        title="Informations sur votre projet"
        description="Décrivez les caractéristiques principales de votre future laverie"
      />
      <div className="space-y-6">
        <ProjectIdentityCard />
        <LocationCard />
        <SurfaceHoursCard />
      </div>
    </div>
  );
}
