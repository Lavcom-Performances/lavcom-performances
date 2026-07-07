import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectInfoForm } from "./ProjectInfoForm";
import { LocalConstraintsForm } from "./LocalConstraintsForm";

export function ProjectTabs() {
  return (
    <Tabs defaultValue="project" className="w-full">
      <TabsList className="grid w-full max-w-md grid-cols-2">
        <TabsTrigger value="project">Mon projet</TabsTrigger>
        <TabsTrigger value="local">Contraintes du local</TabsTrigger>
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
