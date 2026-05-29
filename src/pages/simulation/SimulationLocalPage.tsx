import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { StepMachines } from "@/components/simulation/StepMachines";
import { LocalSurfaceSection } from "@/components/simulation/LocalSurfaceSection";
import { calculateSimulationResults } from "@/types/simulation";
import { useSimulationProject } from "@/hooks/useSimulationProject";
import { useSimulationValidation } from "@/hooks/useSimulationValidation";
import { toast } from "@/hooks/use-toast";

export default function SimulationLocalPage() {
  const navigate = useNavigate();
  const { project, updateProject } = useSimulationProject();
  const [showErrors, setShowErrors] = useState(false);
  const { isValid, errors, errorCount } = useSimulationValidation(project, "local");

  const results = useMemo(() => calculateSimulationResults(project), [project]);

  const handlePrevious = () => {
    navigate("/simulation");
  };

  const handleNext = () => {
    if (!isValid) {
      setShowErrors(true);
      toast({
        title: "Champs obligatoires manquants",
        description: `Veuillez remplir les ${errorCount} champ${errorCount > 1 ? "s" : ""} obligatoire${errorCount > 1 ? "s" : ""} avant de continuer.`,
        variant: "destructive",
      });
      return;
    }
    navigate("/simulation/charges");
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Local & machines</h1>
        <p className="text-muted-foreground mt-1">
          Configurez les machines et leur répartition dans votre local
        </p>
      </div>

      <LocalSurfaceSection
        project={project}
        onUpdate={updateProject}
        errors={errors}
        showErrors={showErrors}
      />

      <StepMachines
        project={project}
        results={results}
        onUpdate={updateProject}
      />

      <div className="flex justify-between items-center pt-6 border-t">
        <Button variant="outline" onClick={handlePrevious} className="gap-2">
          <ChevronLeft className="h-4 w-4" />
          Retour
        </Button>
        <div className="flex items-center gap-4">
          {showErrors && !isValid && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {errorCount} champ{errorCount > 1 ? "s" : ""} obligatoire{errorCount > 1 ? "s" : ""} manquant{errorCount > 1 ? "s" : ""}
            </div>
          )}
          <Button onClick={handleNext} className="gap-2">
            Continuer
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
