import { useTranslation } from "react-i18next";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Clock, FolderPlus, AlertTriangle, Loader2 } from "lucide-react";
import { useSimulatorAddons } from "@/hooks/useSimulatorAddons";

interface SimulatorAddonBannerProps {
  type: "expiring" | "project_limit";
  tier: string;
  daysRemaining?: number;
  onDismiss?: () => void;
}

export function SimulatorAddonBanner({ 
  type, 
  tier, 
  daysRemaining, 
  onDismiss 
}: SimulatorAddonBannerProps) {
  const { i18n } = useTranslation();
  const { purchaseAddon, isLoading } = useSimulatorAddons();

  if (type === "expiring" && daysRemaining !== undefined) {
    return (
      <Alert className="border-amber-500/50 bg-amber-500/10">
        <Clock className="h-4 w-4 text-amber-500" />
        <AlertTitle className="text-amber-600">
          {i18n.language === 'fr' 
            ? `Votre accès expire dans ${daysRemaining} jour${daysRemaining > 1 ? 's' : ''}` 
            : `Your access expires in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}`}
        </AlertTitle>
        <AlertDescription className="flex items-center justify-between gap-4 mt-2">
          <span className="text-sm text-muted-foreground">
            {i18n.language === 'fr' 
              ? "Prolongez votre accès pour continuer à utiliser le simulateur."
              : "Extend your access to continue using the simulator."}
          </span>
          <Button 
            size="sm" 
            variant="outline"
            className="border-amber-500/50 text-amber-600 hover:bg-amber-500/20 shrink-0"
            onClick={() => purchaseAddon("extension_30d", tier)}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Clock className="h-4 w-4 mr-2" />
            )}
            {i18n.language === 'fr' ? "Prolonger 30j" : "Extend 30 days"}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (type === "project_limit") {
    return (
      <Alert className="border-primary/50 bg-primary/10">
        <AlertTriangle className="h-4 w-4 text-primary" />
        <AlertTitle className="text-primary">
          {i18n.language === 'fr' 
            ? "Limite de projets atteinte" 
            : "Project limit reached"}
        </AlertTitle>
        <AlertDescription className="flex items-center justify-between gap-4 mt-2">
          <span className="text-sm text-muted-foreground">
            {i18n.language === 'fr' 
              ? "Ajoutez un emplacement pour créer un nouveau projet."
              : "Add a slot to create a new project."}
          </span>
          <Button 
            size="sm" 
            variant="outline"
            className="border-primary/50 text-primary hover:bg-primary/20 shrink-0"
            onClick={() => purchaseAddon("project_plus1", tier)}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <FolderPlus className="h-4 w-4 mr-2" />
            )}
            {i18n.language === 'fr' ? "+1 Projet" : "+1 Project"}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
