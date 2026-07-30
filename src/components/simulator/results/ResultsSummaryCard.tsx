import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Building2, MapPin, WashingMachine, Wind, Ruler, Pen, LucideIcon } from "lucide-react";
import { useSimulatorProjectContext } from "@/contexts/SimulatorProjectContext";
import { ProjectInfos } from "./ProjectInfos";

export function ResultsSummaryCard() {
  const { project } = useSimulatorProjectContext();
  
  const washerCount: number = project.machines?.filter(
        machine => machine.type === "washer"
      ).length || 0;
  const dryerCount: number = project.machines?.filter(
        machine => machine.type === "dryer"
      ).length || 0;

  const projectInfos: {icon: LucideIcon, info: string}[] = [
    { icon: Building2, info: project.city },
    { icon: MapPin, info: `${project.city} (${project.postalCode})`},
    {
      icon: WashingMachine,
      info: `${washerCount} lave-linge, ${dryerCount} sèche-linge`,
    },
    {icon: Ruler, info: `${project.surface} m²`},
  ];

  return (
    <div className="flex flex-col justify-start border border-solid border-border rounded-xl bg-background/20 shadow-form gap-6 items-start p-6">
      <div className="flex items-center justify-start w-full gap-2">
        <Building2 className="w-4 h-4 text-primary" />
        <h2 className="font-bold text-left text-md text-foreground">
          Résumé du projet
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
          Modifier les infos
        </Link>
      </Button>
    </div>
  );
}
