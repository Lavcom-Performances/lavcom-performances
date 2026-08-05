import { WashingMachine, Wind } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SimulatorPageHeader } from "@/components/simulator/layout/SimulatorPageHeader";
import { SimulatorFooterNav } from "@/components/simulator/layout/SimulatorFooterNav";
import { ConfigHintBanner } from "@/components/simulator/ConfigHintBanner";
import { MachineRevenueSummary } from "@/components/simulator/machines/MachineRevenueSummary";
import { useSimulatorStep } from "@/hooks/useSimulatorStep";
import { SimulatorStepProvider } from "@/contexts/SimulatorStepContext";
import { MachinesConfigCard } from "@/components/simulator/machines/MachinesConfigCard";
import { ProjectWarnings } from "@/components/simulator/ProjectWarnings";
import { useSimulatorProjectContext } from "@/contexts/SimulatorProjectContext";

export default function SimulatorMachinesPage() {
  const { t } = useTranslation("paid-simulator");
  const { guardNext, fieldError, sections, errors } = useSimulatorStep(["washers", "dryers"]);
  const { project } = useSimulatorProjectContext();

  return (
    <>
      <SimulatorPageHeader
        title={t("machines.pageTitle")}
        description={t("machines.pageDescription")}
      />
      <SimulatorStepProvider value={{ fieldError, sections, errors }}>
        <div className="space-y-6">
          <ConfigHintBanner>
            {t("machines.configHint")}
          </ConfigHintBanner>
          <div className="flex gap-4">
            <MachinesConfigCard
              icon={WashingMachine}
              cardTitle={t("machines.washer.cardTitle")}
              cardDescription={t("machines.washer.cardDescription")}
              machineName={t("machines.washer.name")}
              machineCat={t("machines.washer.category")}
              machineType="washer"
            />
            <MachinesConfigCard
              icon={Wind}
              cardTitle={t("machines.dryer.cardTitle")}
              cardDescription={t("machines.dryer.cardDescription")}
              machineName={t("machines.dryer.name")}
              machineCat={t("machines.dryer.category")}
              machineType="dryer"
            />
          </div>

          <ProjectWarnings project={project} />

          <MachineRevenueSummary />
        </div>
      </SimulatorStepProvider>
      <SimulatorFooterNav
        previousPath="/simulator/project"
        nextPath="/simulator/charges"
        onNext={guardNext}
      />
    </>
  );
}
