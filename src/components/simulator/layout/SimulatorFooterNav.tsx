import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

interface Props {
  previousPath?: string;
  nextPath?: string;
  nextLabel?: string;
  previousLabel?: string;
  onNext?: () => boolean | void;
  nextDisabled?: boolean;
  isFinalStep?: boolean;
}

export function SimulatorFooterNav({
  previousPath,
  nextPath,
  nextLabel,
  previousLabel,
  onNext,
  nextDisabled,
  isFinalStep,
}: Props) {
  const { t } = useTranslation("paid-simulator");
  const navigate = useNavigate();
  const nextText = nextLabel ?? t("common.continue");
  const previousText = previousLabel ?? t("common.back");

  const handleNext = () => {
    if (!nextPath) return;
    if (onNext) {
      const ok = onNext();
      if (ok === false) return;
    }
    navigate(nextPath);
  };

  return (
    <div className={isFinalStep
      ? "flex items-center justify-between"
      : "mt-10 flex items-center justify-between border-t pt-6"
    }>
      {previousPath ? (
        <Button variant="outline" asChild className="gap-2">
          <Link to={previousPath}>
            <ChevronLeft className="h-4 w-4" />
            {previousText}
          </Link>
        </Button>
      ) : (
        <span />
      )}
      {nextPath &&
        (onNext ? (
          <Button
            onClick={handleNext}
            disabled={nextDisabled}
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {nextText}
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            asChild
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Link to={nextPath}>
              {nextText}
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        ))}
    </div>
  );
}
