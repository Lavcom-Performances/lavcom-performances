import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface Step {
  id: number;
  name: string;
  description: string;
}

interface SimulationStepperProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export function SimulationStepper({ steps, currentStep, onStepClick }: SimulationStepperProps) {
  return (
    <nav aria-label="Progress" className="w-full">
      <ol className="flex items-center justify-between">
        {steps.map((step, stepIdx) => (
          <li
            key={step.id}
            className={cn(
              "relative flex-1",
              stepIdx !== steps.length - 1 && "pr-8 sm:pr-20"
            )}
          >
            {step.id < currentStep ? (
              // Étape complétée
              <>
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="h-0.5 w-full bg-primary" />
                </div>
                <button
                  onClick={() => onStepClick?.(step.id)}
                  className="relative flex h-8 w-8 items-center justify-center rounded-full bg-primary hover:bg-primary/90 transition-colors"
                >
                  <Check className="h-5 w-5 text-primary-foreground" aria-hidden="true" />
                  <span className="sr-only">{step.name}</span>
                </button>
              </>
            ) : step.id === currentStep ? (
              // Étape actuelle
              <>
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="h-0.5 w-full bg-muted" />
                </div>
                <button
                  className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary bg-background"
                  aria-current="step"
                >
                  <span className="text-sm font-medium text-primary">{step.id}</span>
                  <span className="sr-only">{step.name}</span>
                </button>
              </>
            ) : (
              // Étape future
              <>
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="h-0.5 w-full bg-muted" />
                </div>
                <button
                  className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-muted bg-background"
                  disabled
                >
                  <span className="text-sm font-medium text-muted-foreground">{step.id}</span>
                  <span className="sr-only">{step.name}</span>
                </button>
              </>
            )}
            
            {/* Label de l'étape */}
            <div className="mt-3 hidden sm:block">
              <span
                className={cn(
                  "text-sm font-medium",
                  step.id === currentStep
                    ? "text-primary"
                    : step.id < currentStep
                    ? "text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {step.name}
              </span>
              <p className="text-xs text-muted-foreground">{step.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
}
