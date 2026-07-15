import { TabSectionHeading } from "./TabSectionHeading";
import { ProjectDetailsCard } from "./ProjectDetailsCard";
import type { SimulatorProjectFormProps } from "./types";

export function ProjectInfoForm({ project, onUpdate }: SimulatorProjectFormProps) {
  return (
    <div className="space-y-8">
      <TabSectionHeading
        title="Informations sur votre projet"
        description="Décrivez les caractéristiques principales de votre future laverie"
      />
      <ProjectDetailsCard project={project} onUpdate={onUpdate} />
    </div>
  );
}
