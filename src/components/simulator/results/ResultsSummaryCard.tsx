import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Building2, MapPin, WashingMachine, Wind, Ruler, Pen, LucideIcon } from "lucide-react";
import { useSimulatorProjectContext } from "@/contexts/SimulatorProjectContext";
import { ProjectInfos } from "./ProjectInfos";
import { useTranslation } from "react-i18next";

export function ResultsSummaryCard() {
  const { t } = useTranslation("paid-simulator");
  const { project } = useSimulatorProjectContext();
  
  const washerCount: number = project.machines?.filter(
        machine => machine.type === "washer"
      ).length || 0;
  const dryerCount: number = project.machines?.filter(
        machine => machine.type === "dryer"
      ).length || 0;

  const projectInfos: {icon: LucideIcon, info: string}[] = [
    { icon: Building2, info: project.city },
    { icon: MapPin, info: t("results.summary.cityWithPostalCode", { city: project.city, postalCode: project.postalCode }) },
    {
      icon: WashingMachine,
      info: t("results.summary.machines", { washerCount, dryerCount }),
    },
    { icon: Ruler, info: t("results.summary.surface", { surface: project.surface }) },
  ];

  return (
    <div className="flex flex-col justify-start border border-solid border-border rounded-xl bg-background/20 shadow-form gap-6 items-start p-6">
      <div className="flex items-center justify-start w-full gap-2">
        <Building2 className="w-4 h-4 text-primary" />
        <h2 className="font-bold text-left text-md text-foreground">
          {t("results.summary.title")}
        </h2>
      </div>
      <div className="flex flex-col justify-start gap-3 items-start grow w-full">
        {projectInfos.map((info, index) => (
          <ProjectInfos
            key={index}
            icon={info.icon}
            info={info.info}
          />
        ))}
      </div>
      <Button 
        variant="outline" 
        size="sm"
        asChild 
        className="text-xs"
      >
        <Link to="/simulator/project">
          <Pen />
          {t("results.summary.editInfos")}
        </Link>
      </Button>
    </div>
  );
}
