import { Link, Outlet, useLocation } from "react-router-dom";
import { Home } from "lucide-react";
import { SimulatorStepper } from "@/components/simulator/layout/SimulatorStepper";
import { SimulatorProjectProvider } from "@/contexts/SimulatorProjectContext";

const STEP_BY_PATH: Record<string, 1 | 2 | 3 | 4> = {
  "/simulator/project": 1,
  "/simulator/machines": 2,
  "/simulator/charges": 3,
  "/simulator/results": 4,
};

export default function SimulatorLayout() {
  const { pathname } = useLocation();
  const currentStep = STEP_BY_PATH[pathname] ?? 1;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-40 h-16 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">
          <Link to="/" className="font-display text-lg font-bold text-foreground">
            Lavcom <span className="text-primary">·</span> Simulateur
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <Home className="h-4 w-4" />
            Retour à l'accueil
          </Link>
        </div>
      </header>

      <SimulatorStepper currentStep={currentStep} />

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <Outlet />
      </main>

      <footer className="border-t bg-muted/30 py-6">
        <div className="mx-auto max-w-7xl px-6 text-center text-xs text-muted-foreground">
          Simulateur – Création de laverie · Lavcom Performances
        </div>
      </footer>
    </div>
  );
}
