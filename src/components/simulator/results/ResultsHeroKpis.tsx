import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Pen, TrendingUp, WashingMachine, Wind } from "lucide-react";
import { useSimulatorProjectContext } from "@/contexts/SimulatorProjectContext";
import { ProgressBarWithValue } from "../ProgressBarWithValue";

export function ResultsHeroKpis() {
  const { project } = useSimulatorProjectContext();
  
  const totalRevenue = project.totalRevenue || 4140;
  const washingRevenue = project.washingRevenue || 3180;
  const dryingRevenue = project.dryingRevenue || 960;
  
  const washingShare = Math.round((washingRevenue / totalRevenue) * 100);

  return (
    <div className="flex flex-col justify-start border border-solid border-lavcom-orange rounded-xl bg-muted/40 shadow-form gap-6 items-start px-8 py-6">
      <div className="flex items-center justify-start w-full gap-2">
        <TrendingUp className="w-6 h-6 text-primary" />
        <h2 className="font-bold text-left w-max text-lg text-foreground">
          Recettes estimées
        </h2>
      </div>
      <div className="flex flex-col justify-start items-start gap-4 grow">
        <div className="flex flex-col justify-start items-start w-full gap-1">
          <span className="text-left w-max text-sm text-foreground">
            CA total estimé
          </span>
          <span className="font-bold text-left w-max text-lg text-foreground">
            {totalRevenue.toLocaleString('fr-FR')} €
          </span>
        </div>
        <Separator />
        <ProgressBarWithValue 
          value={washingShare}
          double={true}
        />
        <div className="flex justify-center items-center gap-12 w-fit">
          <div className="flex flex-col justify-start items-center relative w-min shrink-0 gap-y-0 items-start">
            <div className="flex justify-center items-center gap-2">
              <WashingMachine className="h-4 w-4 text-primary"/>   
              <span className="text-left w-max text-sm text-foreground">
                CA lavage
              </span>
            </div>
            <span className="font-semibold text-left w-max text-md text-foreground">
              {washingRevenue.toLocaleString('fr-FR')} €
            </span>
          </div>
          <div className="flex flex-col justify-start items-center relative w-min shrink-0 gap-y-0 items-start">
            <div className="flex justify-center items-center gap-2">
              <Wind className="h-4 w-4 text-lavcom-orange"/>   
              <span className="text-left w-max text-sm text-foreground">
                CA séchage
              </span>
            </div>
            <span className="font-semibold text-left w-max text-md text-foreground">
              {dryingRevenue.toLocaleString('fr-FR')} €
            </span>
          </div>
        </div>
      </div>
      <Button 
        variant="outline" 
        size="sm" 
        asChild 
        className="text-xs"
      >
        <Link to="/simulator/machines">
          <Pen />
          Modifier les machines
        </Link>
      </Button>
    </div>
  );
}
