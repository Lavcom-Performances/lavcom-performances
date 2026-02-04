import { Building2, MapPin, Plus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSites } from "@/hooks/useSites";

interface OnboardingStepLaundryProps {
  onNext: () => void;
  onNavigate: (path: string) => void;
}

export function OnboardingStepLaundry({ onNext, onNavigate }: OnboardingStepLaundryProps) {
  const { sites, isLoading } = useSites();
  
  // Filter out demo sites
  const realSites = sites?.filter(s => !s.is_demo) || [];
  const hasLaundry = realSites.length > 0;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-500/5 mb-4">
          <Building2 className="h-8 w-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold font-display mb-2">
          Configurez votre laverie
        </h2>
        <p className="text-muted-foreground">
          Ajoutez votre première laverie pour commencer à suivre vos performances.
        </p>
      </div>

      {hasLaundry ? (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-3 text-green-700 dark:text-green-400">
              <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center">
                <Building2 className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium">
                  {realSites.length} laverie{realSites.length > 1 ? 's' : ''} configurée{realSites.length > 1 ? 's' : ''}
                </p>
                <p className="text-sm opacity-80">
                  {realSites.map(s => s.name).join(', ')}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => onNavigate('/select-laundromat')}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter une autre laverie
            </Button>
            <Button onClick={onNext}>
              Continuer
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-6 rounded-xl border-2 border-dashed border-muted-foreground/25 bg-muted/30 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
            <h3 className="font-medium mb-1">Aucune laverie configurée</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Ajoutez votre première laverie pour débloquer toutes les fonctionnalités.
            </p>
            <Button onClick={() => onNavigate('/select-laundromat')}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter ma laverie
            </Button>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>Vous pourrez ajouter l'adresse, le nom et d'autres détails.</span>
          </div>

          <Button variant="ghost" onClick={onNext} className="w-full">
            Passer cette étape pour l'instant
          </Button>
        </div>
      )}
    </div>
  );
}
