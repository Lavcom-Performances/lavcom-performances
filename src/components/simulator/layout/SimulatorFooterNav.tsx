import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  previousPath?: string;
  nextPath?: string;
  nextLabel?: string;
  previousLabel?: string;
  onNext?: () => boolean | void;
  nextDisabled?: boolean;
}

export function SimulatorFooterNav({
  previousPath,
  nextPath,
  nextLabel = "Continuer",
  previousLabel = "Retour",
  onNext,
  nextDisabled,
}: Props) {
  const navigate = useNavigate();

  const handleNext = () => {
    if (!nextPath) return;
    if (onNext) {
      const ok = onNext();
      if (ok === false) return;
    }
    navigate(nextPath);
  };

  return (
    <div className="mt-10 flex items-center justify-between border-t pt-6">
      {previousPath ? (
        <Button variant="outline" asChild className="gap-2">
          <Link to={previousPath}>
            <ChevronLeft className="h-4 w-4" />
            {previousLabel}
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
            {nextLabel}
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            asChild
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Link to={nextPath}>
              {nextLabel}
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        ))}
    </div>
  );
}
