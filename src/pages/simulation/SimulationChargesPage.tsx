import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { StepCosts } from "@/components/simulation/StepCosts";
import { 
  SimulationProject, 
  defaultSimulationProject,
  calculateSimulationResults 
} from "@/types/simulation";

export default function SimulationChargesPage() {
  const navigate = useNavigate();
  const [project, setProject] = useState<SimulationProject>(defaultSimulationProject);

  const results = useMemo(() => calculateSimulationResults(project), [project]);

  const updateProject = (updates: Partial<SimulationProject>) => {
    setProject(prev => ({ ...prev, ...updates }));
  };

  const handlePrevious = () => {
    navigate("/simulation/local");
  };

  const handleNext = () => {
    navigate("/simulation/results");
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Charges & financement</h1>
        <p className="text-muted-foreground mt-1">
          Détaillez vos charges fixes, variables et votre plan de financement
        </p>
      </div>

      <StepCosts 
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
          Voir les résultats
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}