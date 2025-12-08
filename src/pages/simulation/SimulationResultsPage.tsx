import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, FileText } from "lucide-react";
import { StepResults } from "@/components/simulation/StepResults";
import { 
  SimulationProject, 
  defaultSimulationProject,
  calculateSimulationResults 
} from "@/types/simulation";

export default function SimulationResultsPage() {
  const navigate = useNavigate();
  const [project, setProject] = useState<SimulationProject>(defaultSimulationProject);

  const results = useMemo(() => calculateSimulationResults(project), [project]);

  const handlePrevious = () => {
    navigate("/simulation/charges");
  };

  const handleEditStep = (stepIndex: number) => {
    const paths = ["/simulation", "/simulation/local", "/simulation/charges", "/simulation/results"];
    navigate(paths[stepIndex] || "/simulation");
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Résultats & rapport</h1>
        <p className="text-muted-foreground mt-1">
          Synthèse de votre simulation et export du rapport complet
        </p>
      </div>

      <StepResults 
        project={project} 
        results={results}
        onEditStep={handleEditStep}
      />

      <div className="flex justify-between pt-6 border-t">
        <Button variant="outline" onClick={handlePrevious} className="gap-2">
          <ChevronLeft className="h-4 w-4" />
          Modifier les charges
        </Button>
        <Button className="gap-2">
          <FileText className="h-4 w-4" />
          Télécharger le rapport PDF
        </Button>
      </div>
    </div>
  );
}