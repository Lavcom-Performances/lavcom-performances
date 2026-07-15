import { SimulatorPageHeader } from "@/components/simulator/layout/SimulatorPageHeader";
import { SimulatorFooterNav } from "@/components/simulator/layout/SimulatorFooterNav";
import { PricingHintBanner } from "@/components/simulator/machines/PricingHintBanner";
import { FixedCostsCard } from "@/components/simulator/charges/FixedCostsCard";
import { VariableCostsCard } from "@/components/simulator/charges/VariableCostsCard";
import { ChargesTotalsBanner } from "@/components/simulator/charges/ChargesTotalsBanner";
import { useSimulatorProject } from "@/hooks/useSimulatorProject";

export default function SimulatorChargesPage() {
  const { project, updateProject } = useSimulatorProject();

  return (
    <>
      <SimulatorPageHeader
        title="Charges & financement"
        description="Détaillez vos charges fixes, variables et votre plan de financement"
      />
      <div className="space-y-6">
        <PricingHintBanner>
          Valeurs indicatives pré-remplies – ajustez selon votre situation
        </PricingHintBanner>
        <FixedCostsCard project={project} onUpdate={updateProject} />
        <VariableCostsCard project={project} onUpdate={updateProject} />
        <ChargesTotalsBanner />
      </div>
      <SimulatorFooterNav
        previousPath="/simulator/machines"
        nextPath="/simulator/results"
        nextLabel="Voir les résultats"
      />
    </>
  );
}
