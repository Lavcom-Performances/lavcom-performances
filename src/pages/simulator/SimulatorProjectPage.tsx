import { useState } from "react";
import { SimulatorPageHeader } from "@/components/simulator/layout/SimulatorPageHeader";
import { SimulatorFooterNav } from "@/components/simulator/layout/SimulatorFooterNav";
import { ProjectTabs } from "@/components/simulator/project/ProjectTabs";
import { useSimulatorStep } from "@/hooks/useSimulatorStep";
import { SimulatorStepProvider } from "@/contexts/SimulatorStepContext";

export default function SimulatorProjectPage() {
  const [activeTab, setActiveTab] = useState<string>("project");
  const { guardNext, fieldError, attempted, sections } = useSimulatorStep(
    ["projectInfo", "localConstraints"],
    {
      onInvalid: (s) =>
        setActiveTab(s === "projectInfo" ? "project" : "local"),
    },
  );

  return (
    <>
      <SimulatorPageHeader
        title="Projet & localisation"
        description="Définissez les informations de base de votre projet de laverie"
      />
      <SimulatorStepProvider value={{ fieldError }}>
        <ProjectTabs
          value={activeTab}
          onValueChange={setActiveTab}
          showErrorBadges={attempted}
          projectErrorCount={sections.projectInfo.errorCount}
          localErrorCount={sections.localConstraints.errorCount}
        />
      </SimulatorStepProvider>
      <SimulatorFooterNav nextPath="/simulator/machines" onNext={guardNext} />
    </>
  );
}
