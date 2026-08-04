import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import type { SimulationProject } from "@/types/simulator.types";
import {
  hasLargeWashers,
  showCapacityWarning,
} from "@/utils/machineWarningsCalculations";

interface WarningItem {
  id: string;
  title: string;
  description: JSX.Element | string;
}

interface ProjectWarningsProps {
  project: Partial<SimulationProject>;
  showTitle?: boolean;
}

function generateProjectWarnings(project: Partial<SimulationProject>): WarningItem[] {
  const warnings: WarningItem[] = [];

  const {
    maxMachinesEstimate,
    userTotalMachines,
    isCapacityWarning,
  } = showCapacityWarning(project);

  if (isCapacityWarning) {
    warnings.push({
      id: "capacity",
      title: "Capacité du local à vérifier",
      description: (
        <>
          Selon la surface et la configuration indiquées, nous estimons qu'il sera difficile
          d'installer plus de <strong>{maxMachinesEstimate} machines</strong>. Vous avez saisi
          <strong> {userTotalMachines} machines</strong>.
          <br />
          Utilisez cette simulation comme un ordre de grandeur et faites valider le
          dimensionnement par un installateur.
        </>
      ),
    });
  }

  const isDoorWarning =
    (project.doorWidth ?? 0) > 0 &&
    (project.doorWidth ?? 0) < 90 &&
    project.canModifyFacade === "no" &&
    hasLargeWashers(project);

  if (isDoorWarning) {
    warnings.push({
      id: "door",
      title: "Attention aux gros lave-linge",
      description: (
        <>
          Avec une porte inférieure à 90 cm et une façade non modifiable, l'installation de
          gros lave-linge (18–20 kg) peut être complexe ou impossible.
          <br />
          Parlez-en avec votre installateur et prévoyez que le coût réel d'installation peut
          être plus élevé.
        </>
      ),
    });
  }

  const isTechnicalWarning = project.technicalConstraints === "heavy_work";

  if (isTechnicalWarning) {
    warnings.push({
      id: "technical",
      title: "Travaux techniques importants à prévoir",
      description: (
        <>
          Vous indiquez que des travaux significatifs sont nécessaires (électricité, évacuation,
          ventilation…).
          <br />
          Les montants réels d'investissement peuvent être nettement supérieurs à ceux de cette
          simulation. Faites valider ces points par un installateur et un artisan avant toute
          décision.
        </>
      ),
    });
  }

  return warnings;
}

export function ProjectWarnings({ project, showTitle = true }: ProjectWarningsProps) {
  const warnings = generateProjectWarnings(project);

  if (warnings.length === 0) return null;

  return (
    <div className="space-y-4">
      {showTitle && (
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-lavcom-orange" />
          Points à prendre en compte
        </h3>
      )}
      <div className="space-y-4">
        {warnings.map((warning) => (
          <Alert
            key={warning.id}
            variant="warning"
          >
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>
              {warning.title}
            </AlertTitle>
            <AlertDescription>
              {warning.description}
            </AlertDescription>
          </Alert>
        ))}
      </div>
    </div>
  );
}
