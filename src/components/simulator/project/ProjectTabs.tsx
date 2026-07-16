import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs";
import { SimulatorTabsTrigger } from "./SimulatorTabsTrigger";
import { ProjectInfoForm } from "./ProjectInfoForm";
import { LocalConstraintsForm } from "./LocalConstraintsForm";

export function ProjectTabs() {
  return (
    <Tabs defaultValue="project" className="w-full">
      <TabsList className="grid w-full max-w-md grid-cols-2">
        <SimulatorTabsTrigger value="project">Mon projet</SimulatorTabsTrigger>
        <SimulatorTabsTrigger value="local">Contraintes du local</SimulatorTabsTrigger>
      </TabsList>
      <TabsContent value="project" className="mt-8">
        <ProjectInfoForm />
      </TabsContent>
      <TabsContent value="local" className="mt-8">
        <LocalConstraintsForm />
      </TabsContent>
    </Tabs>
  );
}
