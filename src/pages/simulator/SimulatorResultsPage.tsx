import { SimulatorPageHeader } from "@/components/simulator/layout/SimulatorPageHeader";
import { SimulatorFooterNav } from "@/components/simulator/layout/SimulatorFooterNav";
import { ResultsSummaryCard } from "@/components/simulator/results/ResultsSummaryCard";
import { ResultsHeroKpis } from "@/components/simulator/results/ResultsHeroKpis";
import { PartialInsightsList } from "@/components/simulator/results/PartialInsightsList";
import { PaywallCallout } from "@/components/simulator/results/PaywallCallout";
import { GuideCallout } from "@/components/simulator/results/GuideCallout";

export default function SimulatorResultsPage() {
  return (
    <>
      <SimulatorPageHeader
        title="Résultats de votre simulation"
        description="Synthèse complète de votre projet de laverie"
      />
      <div className="space-y-6">
        <ResultsSummaryCard />
        <div className="grid gap-6 md:grid-cols-2">
          <ResultsHeroKpis />
          <PartialInsightsList />
        </div>
        <PaywallCallout />
        <GuideCallout />
      </div>
      <SimulatorFooterNav
        previousPath="/simulator/charges"
        previousLabel="Retour à l'étape précédente"
      />
    </>
  );
}
