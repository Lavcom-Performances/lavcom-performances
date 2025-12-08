import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { StepLocal } from "@/components/simulation/StepLocal";
import { StepProjectInfo } from "@/components/simulation/StepProjectInfo";
import { 
  SimulationProject, 
  defaultSimulationProject,
} from "@/types/simulation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SimulationProjectPage() {
  const navigate = useNavigate();
  const [project, setProject] = useState<SimulationProject>(defaultSimulationProject);
  const [activeTab, setActiveTab] = useState("project");

  const updateProject = (updates: Partial<SimulationProject>) => {
    setProject(prev => ({ ...prev, ...updates }));
  };

  const handleNext = () => {
    navigate("/simulation/local");
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Projet & localisation</h1>
        <p className="text-muted-foreground mt-1">
          Définissez les informations de base de votre projet de laverie
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="project">Mon projet</TabsTrigger>
          <TabsTrigger value="local">Contraintes du local</TabsTrigger>
        </TabsList>

        <TabsContent value="project" className="mt-6">
          <StepProjectInfo 
            project={project} 
            onUpdate={updateProject} 
          />
        </TabsContent>

        <TabsContent value="local" className="mt-6">
          <StepLocal 
            project={project} 
            onUpdate={updateProject} 
          />
        </TabsContent>
      </Tabs>

      <div className="flex justify-end pt-6 border-t">
        <Button onClick={handleNext} className="gap-2">
          Continuer
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}