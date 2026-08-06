import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import { useSimulatorProjectContext } from "@/contexts/SimulatorProjectContext";
import { useFormatters } from "@/hooks/useFormatters";
import { calculateProfitability } from "@/utils/profitabilityCalculations";
import { cn } from "@/lib/utils";

const devMode = import.meta.env.VITE_DEV_MODE !== "false";

/** Blurred value: readable layout, unreadable figures before payment */
function BlurredValue({ children }: { children: React.ReactNode }) {
  return (
    <strong className="font-bold blur-[4px] select-none" aria-hidden="true">
      {children}
    </strong>
  );
}

export function PaywallCallout() {
  const { t } = useTranslation("paid-simulator");
  const { project } = useSimulatorProjectContext();
  const { formatCurrencyEUR, formatNumber } = useFormatters();

  const results = calculateProfitability(project);
  const { isProfitable, estimatedProfitMonth, breakEvenCyclesPerDay } = results;

  const profitMonth = formatCurrencyEUR(estimatedProfitMonth);
  const profitYear = formatCurrencyEUR(estimatedProfitMonth * 12);
  const cycles =
    breakEvenCyclesPerDay !== null
      ? formatNumber(breakEvenCyclesPerDay, {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        })
      : "—";

  return (
    <div
      className={cn(
        "flex justify-start items-center w-full gap-4 border border-solid rounded-xl px-12 py-6",
        isProfitable
          ? "bg-lavcom-green-spring/10 border-lavcom-green-accent/30"
          : "bg-destructive/10 border-destructive/30",
      )}
    >
      <div className="flex flex-col self-stretch justify-start">
        {isProfitable ? (
          <TrendingUp className="text-lavcom-green-accent" />
        ) : (
          <TrendingDown className="text-destructive" />
        )}
      </div>
      <div className="flex flex-col justify-start gap-2 items-start">
        <h3
          className={cn(
            "font-bold text-left text-md",
            isProfitable ? "text-lavcom-green-accent" : "text-destructive",
          )}
        >
          {isProfitable
            ? t("results.paywall.profitable.title")
            : t("results.paywall.notProfitable.title")}
        </h3>
        <p className="text-left text-md text-muted-foreground">
          {isProfitable ? (
            <Trans
              t={t}
              i18nKey="results.paywall.profitable.description"
              values={{ profitMonth, profitYear }}
              components={[<BlurredValue key="0" />, <BlurredValue key="1" />]}
            />
          ) : (
            t("results.paywall.notProfitable.description")
          )}
        </p>
        <p className="text-left text-sm text-muted-foreground">
          <Trans
            t={t}
            i18nKey="results.paywall.cyclesNeeded"
            values={{ cycles }}
            components={[<BlurredValue key="0" />]}
          />
        </p>
        <p className="text-left text-sm text-muted-foreground">
          {t("results.paywall.description")}
        </p>
      </div>
      <Button
        size="lg"
        asChild
        className="gap-2 py-6 bg-primary text-primary-foreground hover:bg-primary/90 ml-16 animate-gentle-pulse"
      >
        <Link to={devMode ? "/simulator-payment-success" : "/subscribe-simulator"}>
          <span className="font-semi-bold text-lg text-white">
            {t("results.paywall.cta")}
          </span>
          <ArrowRight />
        </Link>
      </Button>
    </div>
  );
}
