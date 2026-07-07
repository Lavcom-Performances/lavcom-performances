import { SimulatorPageHeader } from "@/components/simulator/shared/SimulatorPageHeader";
import { SimulatorFooterNav } from "@/components/simulator/shared/SimulatorFooterNav";
import { ProjectTabs } from "@/components/simulator/project/ProjectTabs";

export default function SimulatorProjectPage() {
  return (
    <>
      <SimulatorPageHeader
        title="Projet & localisation"
        description="Définissez les informations de base de votre projet de laverie"
      />
      <ProjectTabs />
      <SimulatorFooterNav nextPath="/simulator/machines" />
    </>
  );
}
