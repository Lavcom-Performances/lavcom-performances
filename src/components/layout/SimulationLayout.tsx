import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import { Home, User, LogOut, ChevronRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import lavcomLogo from "@/assets/lavcom-performances-header.png";

interface Step {
  id: string;
  name: string;
  shortName: string;
  path: string;
}

const SIMULATION_STEPS: Step[] = [
  { id: "project", name: "Projet & localisation", shortName: "Projet", path: "/simulation" },
  { id: "premises", name: "Local & machines", shortName: "Local", path: "/simulation/local" },
  { id: "charges", name: "Charges & financement", shortName: "Charges", path: "/simulation/charges" },
  { id: "results", name: "Résultats & rapport", shortName: "Résultats", path: "/simulation/results" },
];

function SimulationStepper() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Determine current step based on pathname
  const currentStepIndex = useMemo(() => {
    const pathIndex = SIMULATION_STEPS.findIndex(step => 
      location.pathname === step.path || 
      (step.path === "/simulation" && location.pathname === "/simulation")
    );
    return pathIndex >= 0 ? pathIndex : 0;
  }, [location.pathname]);

  // For MVP, allow navigation to previous steps only
  const canNavigateToStep = (stepIndex: number) => {
    return stepIndex <= currentStepIndex;
  };

  const handleStepClick = (step: Step, index: number) => {
    if (canNavigateToStep(index)) {
      navigate(step.path);
    }
  };

  return (
    <nav aria-label="Progress" className="w-full">
      <ol className="flex items-center justify-between max-w-3xl mx-auto">
        {SIMULATION_STEPS.map((step, stepIdx) => {
          const isCompleted = stepIdx < currentStepIndex;
          const isCurrent = stepIdx === currentStepIndex;
          const isFuture = stepIdx > currentStepIndex;
          const canNavigate = canNavigateToStep(stepIdx);

          return (
            <li
              key={step.id}
              className={cn(
                "relative flex-1",
                stepIdx !== SIMULATION_STEPS.length - 1 && "pr-4 sm:pr-12"
              )}
            >
              {/* Connector line */}
              {stepIdx !== SIMULATION_STEPS.length - 1 && (
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div 
                    className={cn(
                      "h-0.5 w-full transition-colors",
                      isCompleted ? "bg-primary" : "bg-muted"
                    )} 
                  />
                </div>
              )}

              {/* Step indicator */}
              <button
                onClick={() => handleStepClick(step, stepIdx)}
                disabled={!canNavigate}
                className={cn(
                  "relative flex h-10 w-10 items-center justify-center rounded-full transition-all",
                  isCompleted && "bg-primary hover:bg-primary/90 cursor-pointer",
                  isCurrent && "border-2 border-primary bg-background",
                  isFuture && "border-2 border-muted bg-background cursor-not-allowed",
                  canNavigate && !isCurrent && "cursor-pointer"
                )}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5 text-primary-foreground" aria-hidden="true" />
                ) : (
                  <span 
                    className={cn(
                      "text-sm font-semibold",
                      isCurrent ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {stepIdx + 1}
                  </span>
                )}
                <span className="sr-only">{step.name}</span>
              </button>

              {/* Step label */}
              <div className="mt-2 text-center">
                <span
                  className={cn(
                    "text-xs sm:text-sm font-medium block",
                    isCurrent ? "text-primary" : isCompleted ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  <span className="hidden sm:inline">{step.name}</span>
                  <span className="sm:hidden">{step.shortName}</span>
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function SimulationLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo & Title */}
            <div className="flex items-center gap-3">
              <Link to="/" className="flex items-center">
                <img 
                  src={lavcomLogo} 
                  alt="Lavcom Analytics" 
                  className="h-8 w-auto"
                />
              </Link>
              <div className="hidden sm:block h-6 w-px bg-border" />
              <span className="hidden sm:block text-sm font-medium text-muted-foreground">
                Simulateur – Création de laverie
              </span>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
                <Link to="/" className="gap-2">
                  <Home className="h-4 w-4" />
                  <span className="hidden sm:inline">Retour au site</span>
                </Link>
              </Button>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="rounded-full">
                    <User className="h-4 w-4" />
                    <span className="sr-only">Menu utilisateur</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      Mon compte
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/select-laundromat" className="cursor-pointer">
                      <ChevronRight className="mr-2 h-4 w-4" />
                      Mes laveries
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Déconnexion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Stepper */}
      <div className="border-b bg-muted/30 py-6 px-4">
        <SimulationStepper />
      </div>

      {/* Content */}
      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}