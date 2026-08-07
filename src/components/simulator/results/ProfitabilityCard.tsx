import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Pen, Target, TrendingUp } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "react-i18next";
import { useSimulatorProjectContext } from "@/contexts/SimulatorProjectContext";
import { useFormatters } from "@/hooks/useFormatters";
import { calculateProfitability } from "@/utils/profitabilityCalculations";
import { cn } from "@/lib/utils";

const IS_SIMULATOR_PACK_ACTIVE = false;

function MaskedValue({
  value,
  fallback,
  blurClassName,
  className,
}: {
  value: string;
  fallback: string;
  blurClassName: string;
  className?: string;
}) {
  if (IS_SIMULATOR_PACK_ACTIVE) {
    return <span className={className}>{value}</span>;
  }

  return (
    <span
      className={cn(className, blurClassName, "select-none")}
      aria-hidden="true"
    >
      {fallback}
    </span>
  );
}

export function ProfitabilityCard() {
  const { t } = useTranslation("paid-simulator");
  const { project } = useSimulatorProjectContext();
  const { formatCurrencyEUR, formatNumber } = useFormatters();

  const { estimatedProfitMonth, breakEvenRevenueMonthly, breakEvenCyclesPerDay } =
    calculateProfitability(project);

  const profitMonth = formatCurrencyEUR(estimatedProfitMonth);
  const breakEven =
    breakEvenRevenueMonthly !== null ? formatCurrencyEUR(breakEvenRevenueMonthly) : "—";
  const cycles =
    breakEvenCyclesPerDay !== null
      ? `≈ ${formatNumber(breakEvenCyclesPerDay, {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        })}`
      : "—";

  return (
    <div className="flex flex-col justify-start items-start gap-3 bg-lavcom-green-spring/10 border border-solid border-2 border-lavcom-green-accent/30 rounded-xl px-10 py-6 shadow-profitability">
      <div className="flex justify-start items-center w-full gap-2">
        <Target className="h-12 w-12 stroke-1 text-primary ml-[-4px]"/>
        <h2 
          className="font-bold text-left w-max text-3xl text-foreground">
          {t("results.profitability.title")}
        </h2>
      </div>
      <div className="flex flex-col justify-start items-start w-full gap-1">
        <div className="flex justify-start items-center w-full gap-2 mb-2">
          <TrendingUp className="h-4 w-4 text-lavcom-green-accent" />
          <span className="text-left w-max text-md text-foreground">
            {t("results.profitability.estimatedResult")}
          </span>
        </div>
        <div>
          <MaskedValue
            value={profitMonth}
            fallback="1 234 €"
            blurClassName="blur-[7px]"
            className="font-bold w-max text-4xl text-lavcom-green-accent whitespace-nowrap"
          />
          <span className="font-normal text-sm text-foreground ml-2">{t("common.perMonth")}</span>
        </div>
        <span className="text-left italic w-max text-sm text-foreground">
        {t("results.profitability.disclaimer")}
        </span>
      </div>
      <div className="flex flex-col gap-3 mb-4">
        <Separator className="h-[1.5px]" />
        <div className="flex justify-start items-center gap-4 w-fit">
          <div className="flex flex-col justify-start items-start gap-2">
            <span className="text-left w-max text-sm text-foreground">
              {t("results.profitability.breakEven")}
            </span>
            <MaskedValue
              value={breakEven}
              fallback="1 234 €"
              blurClassName="blur-[3px]"
              className="font-bold text-left w-max text-md text-foreground whitespace-nowrap"
            />
          </div>
          <Separator orientation="vertical" className="h-[50px] w-[1.5px]" />
          <div className="flex flex-col justify-start items-start gap-2">
            <span className="text-left w-max text-sm text-foreground">
              {t("results.profitability.cyclesPerDay")}
            </span>
            <MaskedValue
              value={cycles}
              fallback="≈ 00"
              blurClassName="blur-[3px]"
              className="font-bold text-left w-max text-md text-foreground whitespace-nowrap"
            />
          </div>
        </div>
      </div>
      <Button 
        variant="outline" 
        size="sm"
        asChild 
        className="text-xs"
      >
        <Link to="/simulator/charges">
          <Pen />
          {t("results.profitability.editCharges")}
        </Link>
      </Button>
    </div>
  );
}
