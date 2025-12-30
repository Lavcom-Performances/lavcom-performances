import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { StepResults } from "@/components/simulation/StepResults";
import { ExpertSection } from "@/components/landing/ExpertSection";
import { calculateSimulationResults } from "@/types/simulation";
import { useSimulationProject } from "@/hooks/useSimulationProject";

export default function SimulationResultsPage() {
  const navigate = useNavigate();
  const { project } = useSimulationProject();

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

      <div className="flex justify-start pt-6 border-t">
        <Button variant="outline" onClick={handlePrevious} className="gap-2">
          <ChevronLeft className="h-4 w-4" />
          Modifier les charges
        </Button>
      </div>

      {/* Expert Section */}
      <ExpertSection variant="simulator" className="mt-12 -mx-6 px-6" />
    </div>
  );
}