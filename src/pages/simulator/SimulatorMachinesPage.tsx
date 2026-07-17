import { SimulatorPageHeader } from "@/components/simulator/layout/SimulatorPageHeader";
import { SimulatorFooterNav } from "@/components/simulator/layout/SimulatorFooterNav";
import { PricingHintBanner } from "@/components/simulator/machines/PricingHintBanner";
import { WashersConfigCard } from "@/components/simulator/machines/WashersConfigCard";
import { DryersConfigCard } from "@/components/simulator/machines/DryersConfigCard";
import { MachineMixSummary } from "@/components/simulator/machines/MachineMixSummary";
import { useSimulatorStep } from "@/hooks/useSimulatorStep";
import { SimulatorStepProvider } from "@/contexts/SimulatorStepContext";

export default function SimulatorMachinesPage() {
  const { guardNext, fieldError } = useSimulatorStep(["machines"]);
  return (
    <>
      <SimulatorPageHeader
        title="Configuration des machines"
        description="Configurez les machines et leur répartition dans votre local"
      />
      <SimulatorStepProvider value={{ fieldError }}>
        <div className="space-y-6">
          <PricingHintBanner>
            Configuration pré-remplie avec une laverie type – ajustez selon votre projet
          </PricingHintBanner>
          <WashersConfigCard />
          <DryersConfigCard />
          <MachineMixSummary />
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
