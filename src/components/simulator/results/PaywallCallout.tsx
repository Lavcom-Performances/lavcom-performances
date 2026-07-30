import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp } from "lucide-react";

const devMode = import.meta.env.VITE_DEV_MODE !== "false";

export function PaywallCallout() {
  return (
    <div className="flex justify-start items-center w-full gap-4 bg-lavcom-green-spring/10 border border-solid border-lavcom-green-accent/30 rounded-xl px-12 py-6">
      <div className="flex flex-col self-stretch justify-start">
        <TrendingUp className="text-lavcom-green-accent"/>
      </div>
      <div className="flex flex-col justify-start gap-2 items-start">
        <h3 className="font-bold text-left text-md text-lavcom-green-accent">
          Projet au-dessus du seuil de rentabilité
        </h3>
        <p className="text-left text-md text-muted-foreground">
          Pour avoir accès à l'analyse complète de votre projet, vous devez choisir une formule.
        </p>
      </div>
      <Button 
        size="lg" 
        asChild
        className="gap-2 py-6 bg-primary text-primary-foreground hover:bg-primary/90 ml-16"
      >
        <Link to={devMode ? "/simulator-payment-success" : "/subscribe-simulator"}>
          <span className="font-semi-bold text-lg text-white">Découvrir les formules</span>
          <ArrowRight />
        </Link>
      </Button>
    </div>
  );
}
