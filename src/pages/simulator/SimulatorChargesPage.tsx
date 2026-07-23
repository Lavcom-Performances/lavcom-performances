import { BadgeEuro, BadgePercent } from "lucide-react";
import { SimulatorPageHeader } from "@/components/simulator/layout/SimulatorPageHeader";
import { SimulatorFooterNav } from "@/components/simulator/layout/SimulatorFooterNav";
import { ConfigHintBanner } from "@/components/simulator/ConfigHintBanner";
import { CostsCard } from "@/components/simulator/charges/CostsCard";
import { TotalCostsSummary } from "@/components/simulator/charges/TotalCostsSummary";
import { useSimulatorStep } from "@/hooks/useSimulatorStep";
import { SimulatorStepProvider } from "@/contexts/SimulatorStepContext";

export default function SimulatorChargesPage() {
  const { guardNext, fieldError } = useSimulatorStep(["charges"]);
  return (
    <>
      <SimulatorPageHeader
        title="Charges"
        description="Détaillez vos charges fixes et variables"
      />
      <SimulatorStepProvider value={{ fieldError }}>
        <div className="space-y-6">
          <ConfigHintBanner>
            Valeurs indicatives pré-remplies – ajustez selon votre situation
          </ConfigHintBanner>
          <div className="flex gap-4">
            <CostsCard
              icon={BadgeEuro}
              cardTitle="Charges fixes mensuelles"
              cardDescription="Montants fixes à payer chaque mois"
              costType="fixed"
            />
            <CostsCard
              icon={BadgePercent}
              cardTitle="Charges variables"
              cardDescription="Estimées en pourcentage du chiffre d'affaires"
              costType="variable"
              showHint={true}
            />
          </div>
          <TotalCostsSummary />
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
