import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS: { id: 1 | 2 | 3 | 4; label: string; path: string }[] = [
  { id: 1, label: "Projet & localisation", path: "/simulator/project" },
  { id: 2, label: "Configuration des machines", path: "/simulator/machines" },
  { id: 3, label: "Charges & financement", path: "/simulator/charges" },
  { id: 4, label: "Résultats", path: "/simulator/results" },
];

interface Props {
  currentStep: 1 | 2 | 3 | 4;
}

export function SimulatorStepper({ currentStep }: Props) {
  return (
    <nav
      aria-label="Étapes de la simulation"
      className="w-full border-b bg-muted/30"
    >
      <ol className="mx-auto flex max-w-4xl items-start gap-2 overflow-x-auto px-6 py-6 md:gap-6">
        {STEPS.map((step, idx) => {
          const isCompleted = step.id < currentStep;
          const isActive = step.id === currentStep;
          const isClickable = step.id < currentStep;

          const Content = (
            <div className="flex min-w-[140px] flex-col items-center gap-2">
              <div className="flex w-full items-center">
                {idx > 0 && (
                  <div
                    className={cn(
                      "h-0.5 flex-1",
                      isCompleted || isActive ? "bg-primary" : "bg-border"
                    )}
                  />
                )}
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 bg-background text-sm font-semibold transition",
                    isActive && "border-primary text-primary",
                    isCompleted && "border-primary bg-primary text-primary-foreground",
                    !isActive && !isCompleted && "border-border text-muted-foreground"
                  )}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : step.id}
                </div>
                {idx < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "h-0.5 flex-1",
                      step.id < currentStep ? "bg-primary" : "bg-border"
                    )}
                  />
                )}
              </div>
              <span
                className={cn(
                  "text-center text-xs font-medium md:text-sm",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
          );

          return (
            <li key={step.id} className="flex-1">
              {isClickable ? (
                <Link to={step.path} className="block hover:opacity-80">
                  {Content}
                </Link>
              ) : (
                Content
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
