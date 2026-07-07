import { SimulatorPageHeader } from "@/components/simulator/shared/SimulatorPageHeader";
import { SimulatorFooterNav } from "@/components/simulator/shared/SimulatorFooterNav";
import { PricingHintBanner } from "@/components/simulator/machines/PricingHintBanner";
import { WashersConfigCard } from "@/components/simulator/machines/WashersConfigCard";
import { DryersConfigCard } from "@/components/simulator/machines/DryersConfigCard";
import { MachineMixSummary } from "@/components/simulator/machines/MachineMixSummary";

export default function SimulatorMachinesPage() {
  return (
    <>
      <SimulatorPageHeader
        title="Configuration des machines"
        description="Configurez les machines et leur répartition dans votre local"
      />
      <div className="space-y-6">
        <PricingHintBanner>
          Configuration pré-remplie avec une laverie type – ajustez selon votre projet
        </PricingHintBanner>
        <WashersConfigCard />
        <DryersConfigCard />
        <MachineMixSummary />
      </div>
      <SimulatorFooterNav
        previousPath="/simulator/project"
        nextPath="/simulator/charges"
      />
    </>
  );
}
