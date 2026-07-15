import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs";
import { SimulatorTabsTrigger } from "./SimulatorTabsTrigger";
import { ProjectInfoForm } from "./ProjectInfoForm";
import { LocalConstraintsForm } from "./LocalConstraintsForm";
import type { SimulatorProjectFormProps } from "@/types/simulator.types";

export function ProjectTabs({ project, onUpdate }: SimulatorProjectFormProps) {
  return (
    <Tabs defaultValue="project" className="w-full">
      <TabsList className="grid w-full max-w-md grid-cols-2">
        <SimulatorTabsTrigger value="project">Mon projet</SimulatorTabsTrigger>
        <SimulatorTabsTrigger value="local">Contraintes du local</SimulatorTabsTrigger>
      </TabsList>
      <TabsContent value="project" className="mt-8">
        <ProjectInfoForm project={project} onUpdate={onUpdate} />
      </TabsContent>
      <TabsContent value="local" className="mt-8">
        <LocalConstraintsForm project={project} onUpdate={onUpdate} />
      </TabsContent>
    </Tabs>
  );
}
