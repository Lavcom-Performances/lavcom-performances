import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import type { SimulationProject } from "@/types/simulator.types";
import {
  hasLargeWashers,
  showCapacityWarning,
} from "@/utils/machineWarningsCalculations";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

interface WarningItem {
  id: string;
  title: string;
  description: JSX.Element | string;
}

interface ProjectWarningsProps {
  project: Partial<SimulationProject>;
  showTitle?: boolean;
}

function generateProjectWarnings(
  project: Partial<SimulationProject>,
  t: TFunction,
): WarningItem[] {
  const warnings: WarningItem[] = [];

  const {
    maxMachinesEstimate,
    userTotalMachines,
    isCapacityWarning,
  } = showCapacityWarning(project);

  if (isCapacityWarning) {
    warnings.push({
      id: "capacity",
      title: t("warnings.capacity.title"),
      description: (
        <>
          {t("warnings.capacity.intro")}{" "}
          <strong>{t("warnings.capacity.maxMachines", { count: maxMachinesEstimate })}</strong>.{" "}
          {t("warnings.capacity.youEntered")}{" "}
          <strong>{t("warnings.capacity.userMachines", { count: userTotalMachines })}</strong>.
          <br />
          {t("warnings.capacity.advice")}
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
      title: t("warnings.door.title"),
      description: (
        <>
          {t("warnings.door.intro")}
          <br />
          {t("warnings.door.advice")}
        </>
      ),
    });
  }

  const isTechnicalWarning = project.technicalConstraints === "heavy_work";

  if (isTechnicalWarning) {
    warnings.push({
      id: "technical",
      title: t("warnings.technical.title"),
      description: (
        <>
          {t("warnings.technical.intro")}
          <br />
          {t("warnings.technical.advice")}
        </>
      ),
    });
  }

  return warnings;
}

export function ProjectWarnings({ project, showTitle = true }: ProjectWarningsProps) {
  const { t } = useTranslation("paid-simulator");
  const warnings = generateProjectWarnings(project, t);

  if (warnings.length === 0) return null;

  return (
    <div className="space-y-4">
      {showTitle && (
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-lavcom-orange" />
          {t("warnings.sectionTitle")}
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
