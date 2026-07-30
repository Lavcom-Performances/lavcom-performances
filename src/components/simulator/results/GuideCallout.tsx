import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from 'lucide-react';

export function GuideCallout() {
  return (
    <div className="flex justify-start px-12 gap-6 border-solid border border-primary/30 rounded-xl bg-white w-full h-fit">
      <div className="flex flex-col justify-center items-center bg-primary/20 px-6 py-6">
        <div className="rounded-xl w-full h-fit shadow-form">
          <img 
            src="/src/assets/ebook-avant-ouvrir.jpg" 
            alt="Guide Avant d'ouvrir - Le guide du futur exploitant de laverie"
            className="rounded-xl h-[300px]"
          />
        </div>
      </div>
      <div className="flex flex-col h-fit justify-start gap-y-4 items-start my-8">
        <Badge>Ressource indispensable</Badge>
        <h3 className="font-bold text-left w-full">
          Avant d'ouvrir : le guide du futur exploitant
        </h3>
        <p className="text-left text-md text-muted-foreground max-w-2xl">
          Ne lancez pas votre projet sans ce guide. Étude de zone en 6 points, grilles d'audit local,
          budget CAPEX/OPEX détaillé, check-list "Prêt à ouvrir"… Tout ce que les banques et
          installateurs attendent de vous.
        </p>
        <div className="flex items-center justify-start w-full gap-3 mt-12">
          <Button 
            size="lg" 
            asChild
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Link to="https://lavcom.fr/nos-ebooks-2/" target="_blank">
              <span className="font-medium text-md text-white">Découvrir le guide</span>
              <ArrowRight />
            </Link>
          </Button>
          <span className="inline text-left w-max text-sm text-muted-foreground">
            Collection Laverie Pro by Lavcom
          </span>
        </div>
      </div>
    </div>
  );
}
