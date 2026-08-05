import { ResultsSummaryCard } from "@/components/simulator/results/ResultsSummaryCard";
import { ResultsHeroKpis } from "@/components/simulator/results/ResultsHeroKpis";
import { ProfitabilityCard } from "@/components/simulator/results/ProfitabilityCard";
import { PaywallCallout } from "@/components/simulator/results/PaywallCallout";
import { GuideCallout } from "@/components/simulator/results/GuideCallout";
import { SimulatorPageHeader } from "@/components/simulator/layout/SimulatorPageHeader";
import { ProjectWarnings } from "@/components/simulator/ProjectWarnings";
import { useSimulatorProjectContext } from "@/contexts/SimulatorProjectContext";
import { useTranslation } from "react-i18next";

export default function SimulatorResultsPage() {
  const { t } = useTranslation("paid-simulator");
  const { project } = useSimulatorProjectContext();

  return (
    <>
      <div className="flex flex-col gap-6 w-fit">
        <SimulatorPageHeader
          title={t("results.pageTitle")}
          description={t("results.pageDescription")}
          isFinalStep={true}
        />
        <div className="flex justify-start items-center gap-4 w-full">
          <ResultsSummaryCard />
          <ResultsHeroKpis />
          <ProfitabilityCard />
        </div>
        <PaywallCallout />
        <ProjectWarnings project={project} />
        <GuideCallout />
      </div>
    </>
  );
}
