import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronRight, AlertCircle } from "lucide-react";
import { StepLocal } from "@/components/simulation/StepLocal";
import { StepProjectInfo } from "@/components/simulation/StepProjectInfo";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSimulationValidation } from "@/hooks/useSimulationValidation";
import { useSimulationProject } from "@/hooks/useSimulationProject";
import { toast } from "@/hooks/use-toast";

export default function SimulationProjectPage() {
  const navigate = useNavigate();
  const { project, updateProject } = useSimulationProject();
  const [activeTab, setActiveTab] = useState("project");
  const [showErrors, setShowErrors] = useState(false);
  
  const { isValid, errors, errorCount } = useSimulationValidation(project);

  const handleNext = () => {
    if (!isValid) {
      setShowErrors(true);
      toast({
        title: "Champs obligatoires manquants",
        description: `Veuillez remplir les ${errorCount} champ${errorCount > 1 ? 's' : ''} obligatoire${errorCount > 1 ? 's' : ''} avant de continuer.`,
        variant: "destructive",
      });
      // Basculer vers l'onglet projet s'il y a des erreurs là
      if (errors.name || errors.city || errors.zone_type || errors.surface_m2 || errors.opening_hours_description) {
        setActiveTab("project");
      }
      return;
    }
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
          <TabsTrigger value="project" className="relative">
            Mon projet
            {showErrors && errorCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                {errorCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="local">Contraintes du local</TabsTrigger>
        </TabsList>

        <TabsContent value="project" className="mt-6">
          <StepProjectInfo 
            project={project} 
            onUpdate={updateProject}
            errors={errors}
            showErrors={showErrors}
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
        {showErrors && !isValid && (
          <div className="flex items-center gap-2 text-sm text-destructive mr-4">
            <AlertCircle className="h-4 w-4" />
            {errorCount} champ{errorCount > 1 ? 's' : ''} obligatoire{errorCount > 1 ? 's' : ''} manquant{errorCount > 1 ? 's' : ''}
          </div>
        )}
        <Button onClick={handleNext} className="gap-2">
          Continuer
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}