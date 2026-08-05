import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SimulatorFooterNav } from "./SimulatorFooterNav";
import { useTranslation } from "react-i18next";

interface Props {
  title: string;
  description: string;
  onReset?: () => void;
  isFinalStep?: boolean;
}

export function SimulatorPageHeader({
  title,
  description,
  onReset,
  isFinalStep,
}: Props) {
  const { t } = useTranslation("paid-simulator");
  return (isFinalStep
    ? (<div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4 w-full">
        <SimulatorFooterNav
          previousPath="/simulator/charges"
          previousLabel={t("common.backToPreviousStep")}
          isFinalStep={isFinalStep}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={onReset}
          className="gap-2 text-muted-foreground hover:text-orange-600"
        >
          <RotateCcw className="h-4 w-4" />
          {t("common.reset")}
        </Button>
      </div>
      <div className="flex flex-col items-center w-full mb-8">
        <h1 className="font-display text-2xl font-bold text-foreground">{title}</h1>
        <p className="mt-1 text-base text-muted-foreground">{description}</p>
      </div>
    </div>)
    : (<div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">{title}</h1>
        <p className="mt-1 text-base text-muted-foreground">{description}</p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onReset}
        className="gap-2 text-muted-foreground hover:text-orange-600"
      >
        <RotateCcw className="h-4 w-4" />
        {t("common.reset")}
      </Button>
    </div>)
  );
}
