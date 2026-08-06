import { BadgeEuro, BadgePercent } from "lucide-react";
import { SimulatorPageHeader } from "@/components/simulator/layout/SimulatorPageHeader";
import { SimulatorFooterNav } from "@/components/simulator/layout/SimulatorFooterNav";
import { ConfigHintBanner } from "@/components/simulator/ConfigHintBanner";
import { CostsCard } from "@/components/simulator/charges/CostsCard";
import { TotalCostsSummary } from "@/components/simulator/charges/TotalCostsSummary";
import { useSimulatorStep } from "@/hooks/useSimulatorStep";
import { SimulatorStepProvider } from "@/contexts/SimulatorStepContext";
import { useTranslation } from "react-i18next";

export default function SimulatorChargesPage() {
  const { t } = useTranslation("paid-simulator");
  const { guardNext, fieldError, sections, errors, attempted } = useSimulatorStep(["charges"]);
  return (
    <>
      <SimulatorPageHeader
        title={t("charges.pageTitle")}
        description={t("charges.pageDescription")}
      />
      <SimulatorStepProvider value={{ fieldError, sections, errors, attempted }}>
        <div className="space-y-6">
          <ConfigHintBanner>
            {t("charges.configHint")}
          </ConfigHintBanner>
          <div className="flex gap-4">
            <CostsCard
              icon={BadgeEuro}
              cardTitle={t("charges.fixed.cardTitle")}
              cardDescription={t("charges.fixed.cardDescription")}
              costType="fixed"
              width="w-3/5"
            />
            <CostsCard
              icon={BadgePercent}
              cardTitle={t("charges.variable.cardTitle")}
              cardDescription={t("charges.variable.cardDescription")}
              costType="variable"
              showHint={true}
              width="w-2/5"
            />
          </div>
          <TotalCostsSummary />
        </div>
      </SimulatorStepProvider>
      <SimulatorFooterNav
        previousPath="/simulator/machines"
        nextPath="/simulator/results"
        nextLabel={t("common.seeResults")}
        onNext={guardNext}
      />
    </>
  );
}
