import { WashingMachine, Wind } from "lucide-react";
import { SimulatorPageHeader } from "@/components/simulator/layout/SimulatorPageHeader";
import { SimulatorFooterNav } from "@/components/simulator/layout/SimulatorFooterNav";
import { ConfigHintBanner } from "@/components/simulator/ConfigHintBanner";
import { MachineRevenueSummary } from "@/components/simulator/machines/MachineRevenueSummary";
import { useSimulatorStep } from "@/hooks/useSimulatorStep";
import { SimulatorStepProvider } from "@/contexts/SimulatorStepContext";
import { MachinesConfigCard } from "@/components/simulator/machines/MachinesConfigCard";

export default function SimulatorMachinesPage() {
  const { guardNext, fieldError } = useSimulatorStep(["washers", "dryers"]);
  return (
    <>
      <SimulatorPageHeader
        title="Configuration des machines"
        description="Configurez les machines et leur répartition dans votre local"
      />
      <SimulatorStepProvider value={{ fieldError }}>
        <div className="space-y-6">
          <ConfigHintBanner>
            Configuration pré-remplie avec une laverie type – ajustez selon votre projet
          </ConfigHintBanner>
          <div className="flex gap-4">
            <MachinesConfigCard
              icon={WashingMachine}
              cardTitle="Lave-linge"
              cardDescription="Configurez vos machines à laver"
              machineName="lave-linge"
              machineCat="lavage"
              machineType="washer"
            />
            <MachinesConfigCard
              icon={Wind}
              cardTitle="Sèche-linge"
              cardDescription="Configurez vos sèche-linge"
              machineName="sèche-linge"
              machineCat="séchage"
              machineType="dryer"
            />
          </div>   
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
