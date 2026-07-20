import { SimulatorPageHeader } from "@/components/simulator/layout/SimulatorPageHeader";
import { SimulatorFooterNav } from "@/components/simulator/layout/SimulatorFooterNav";
import { ConfigHintBanner } from "@/components/simulator/ConfigHintBanner";
import { FixedCostsCard } from "@/components/simulator/charges/FixedCostsCard";
import { VariableCostsCard } from "@/components/simulator/charges/VariableCostsCard";
import { ChargesTotalsBanner } from "@/components/simulator/charges/ChargesTotalsBanner";
import { useSimulatorStep } from "@/hooks/useSimulatorStep";
import { SimulatorStepProvider } from "@/contexts/SimulatorStepContext";

export default function SimulatorChargesPage() {
  const { guardNext, fieldError } = useSimulatorStep(["charges"]);
  return (
    <>
      <SimulatorPageHeader
        title="Charges & financement"
        description="Détaillez vos charges fixes, variables et votre plan de financement"
      />
      <SimulatorStepProvider value={{ fieldError }}>
        <div className="space-y-6">
          <ConfigHintBanner>
            Valeurs indicatives pré-remplies – ajustez selon votre situation
          </ConfigHintBanner>
          <FixedCostsCard />
          <VariableCostsCard />
          <ChargesTotalsBanner />
        </div>
      </SimulatorStepProvider>
      <SimulatorFooterNav
        previousPath="/simulator/machines"
        nextPath="/simulator/results"
        nextLabel="Voir les résultats"
        onNext={guardNext}
      />
    </>
  );
}
