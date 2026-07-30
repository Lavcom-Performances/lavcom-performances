import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Pen, Target, TrendingUp } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export function ProfitabilityCard() {
  return (
    <div className="flex flex-col justify-start items-start gap-3 bg-lavcom-green-spring/10 border border-solid border-2 border-lavcom-green-accent/30 rounded-xl px-10 py-6 shadow-profitability">
      <div className="flex justify-start items-center w-full gap-2">
        <Target className="h-12 w-12 stroke-1 text-primary ml-[-4px]"/>
        <h2 
          className="font-bold text-left w-max text-3xl text-foreground">
          Rentabilité
        </h2>
      </div>
      <div className="flex flex-col justify-start items-start w-full gap-1">
        <div className="flex justify-start items-center w-full gap-2 mb-2">
          <TrendingUp className="h-4 w-4 text-lavcom-green-accent" />
          <span className="text-left w-max text-md text-foreground">
            Résultat estimé
          </span>
        </div>
        <div>
          <span className="font-bold w-max text-4xl text-lavcom-green-accent blur-[6px]">
            1 234 € 
          </span>
          <span className="font-normal text-sm text-foreground ml-2">/ mois</span>
        </div>
        <span className="text-left italic w-max text-sm text-foreground">
        * Estimation indicative
        </span>
      </div>
      <div className="flex flex-col gap-3 mb-4">
        <Separator className="h-[1.5px]" />
        <div className="flex justify-start items-center gap-4 w-fit">
          <div className="flex flex-col justify-start items-start gap-2">
            <span className="text-left w-max text-sm text-foreground">
              Seuil de rentabilité
            </span>
            <span className="font-bold text-left w-max text-md text-foreground blur-[3px]">
              1 234 €
            </span>
          </div>
          <Separator orientation="vertical" className="h-[50px] w-[1.5px]" />
          <div className="flex flex-col justify-start items-start gap-2">
            <span className="text-left w-max text-sm text-foreground">
              Cycles/jour nécessaires
            </span>
            <span className="font-bold text-left w-max text-md text-foreground blur-[3px]">
              ≈ 00
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
        <Link to="/simulator/project">
          <Pen />
          Modifier les charges
        </Link>
      </Button>
    </div>
  );
}
