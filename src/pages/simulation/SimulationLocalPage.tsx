import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { StepMachines } from "@/components/simulation/StepMachines";
import { calculateSimulationResults } from "@/types/simulation";
import { useSimulationProject } from "@/hooks/useSimulationProject";

export default function SimulationLocalPage() {
  const navigate = useNavigate();
  const { project, updateProject } = useSimulationProject();

  const results = useMemo(() => calculateSimulationResults(project), [project]);

  const handlePrevious = () => {
    navigate("/simulation");
  };

  const handleNext = () => {
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

      <StepMachines 
        project={project} 
        results={results}
        onUpdate={updateProject} 
      />

      <div className="flex justify-between pt-6 border-t">
        <Button variant="outline" onClick={handlePrevious} className="gap-2">
          <ChevronLeft className="h-4 w-4" />
          Retour
        </Button>
        <Button onClick={handleNext} className="gap-2">
          Continuer
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}