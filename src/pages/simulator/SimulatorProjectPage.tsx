import { SimulatorPageHeader } from "@/components/simulator/layout/SimulatorPageHeader";
import { SimulatorFooterNav } from "@/components/simulator/layout/SimulatorFooterNav";
import { ProjectTabs } from "@/components/simulator/project/ProjectTabs";
import { useSimulatorProject } from "@/hooks/useSimulatorProject";

export default function SimulatorProjectPage() {
  const { project, updateProject } = useSimulatorProject();

  return (
    <>
      <SimulatorPageHeader
        title="Projet & localisation"
        description="Définissez les informations de base de votre projet de laverie"
      />
      <ProjectTabs project={project} onUpdate={updateProject} />
      <SimulatorFooterNav nextPath="/simulator/machines" />
    </>
  );
}
