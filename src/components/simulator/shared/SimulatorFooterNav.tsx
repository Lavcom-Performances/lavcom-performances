import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  previousPath?: string;
  nextPath?: string;
  nextLabel?: string;
  previousLabel?: string;
}

export function SimulatorFooterNav({
  previousPath,
  nextPath,
  nextLabel = "Continuer",
  previousLabel = "Retour",
}: Props) {
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
      {nextPath && (
        <Button asChild className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
          <Link to={nextPath}>
            {nextLabel}
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      )}
    </div>
  );
}
