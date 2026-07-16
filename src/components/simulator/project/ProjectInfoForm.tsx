import { TabSectionHeading } from "./TabSectionHeading";
import { ProjectDetailsCard } from "./ProjectDetailsCard";

export function ProjectInfoForm() {
  return (
    <div className="space-y-8">
      <TabSectionHeading
        title="Informations sur votre projet"
        description="Décrivez les caractéristiques principales de votre future laverie"
      />
      <ProjectDetailsCard />
    </div>
  );
}
