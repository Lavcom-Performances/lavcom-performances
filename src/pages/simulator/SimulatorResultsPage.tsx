import { ResultsSummaryCard } from "@/components/simulator/results/ResultsSummaryCard";
import { ResultsHeroKpis } from "@/components/simulator/results/ResultsHeroKpis";
import { ProfitabilityCard } from "@/components/simulator/results/ProfitabilityCard";
import { PaywallCallout } from "@/components/simulator/results/PaywallCallout";
import { GuideCallout } from "@/components/simulator/results/GuideCallout";
import { SimulatorPageHeader } from "@/components/simulator/layout/SimulatorPageHeader";

export default function SimulatorResultsPage() {
  return (
    <>
      <div className="flex flex-col gap-6 w-fit">
        <SimulatorPageHeader
          title="Résultats de votre simulation"
          description="Synthèse complète de votre projet de laverie"
          isFinalStep={true}
        />
        <div className="flex justify-start items-center gap-4 w-full">
          <ResultsSummaryCard />
          <ResultsHeroKpis />
          <ProfitabilityCard />
        </div>
        <PaywallCallout />
        <GuideCallout />
      </div>
    </>
  );
}
