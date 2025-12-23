import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, FolderPlus, Loader2, Check, Lock } from "lucide-react";
import { ADDON_PRICING, getAddonPrice } from "@/config/pricingConfig";
import { useSimulatorAddons } from "@/hooks/useSimulatorAddons";

interface SimulatorAddonsSectionProps {
  tier: string;
  maxProjects: number;
  isProjectLimitReached?: boolean;
}

export function SimulatorAddonsSection({ 
  tier, 
  maxProjects, 
  isProjectLimitReached = false 
}: SimulatorAddonsSectionProps) {
  const { t, i18n } = useTranslation(['app', 'common']);
  const { purchaseAddon, isLoading } = useSimulatorAddons();

  const extensionPrice = getAddonPrice("extension_30d", tier);
  const projectPrice = getAddonPrice("project_plus1", tier);

  // Check if tier has unlimited projects (comparator = 10 considered "enough")
  const hasUnlimitedProjects = tier === "comparator" || maxProjects >= 10;

  const handleExtensionPurchase = () => {
    purchaseAddon("extension_30d", tier);
  };

  const handleProjectPurchase = () => {
    purchaseAddon("project_plus1", tier);
  };

  return (
    <Card className="border-dashed border-border/50">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          {i18n.language === 'fr' ? "Options ponctuelles" : "One-time options"}
          <Badge variant="secondary" className="text-xs">
            {i18n.language === 'fr' ? "Sans abonnement" : "No subscription"}
          </Badge>
        </CardTitle>
        <CardDescription>
          {i18n.language === 'fr' 
            ? "Paiement unique, sans renouvellement automatique."
            : "One-time payment, no automatic renewal."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Extension 30 jours */}
          <div className="p-4 rounded-lg border border-border/50 bg-muted/20 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 rounded-lg">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h4 className="font-semibold">
                    {i18n.language === 'fr' ? "Extension 30 jours" : "30-day extension"}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {i18n.language === 'fr' 
                      ? "Prolonge votre accès"
                      : "Extends your access"}
                  </p>
                </div>
              </div>
              <span className="text-lg font-bold">
                {extensionPrice?.price || 39}€
              </span>
            </div>
            <Button 
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleExtensionPurchase}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Clock className="h-4 w-4 mr-2" />
              )}
              {i18n.language === 'fr' ? "Prolonger" : "Extend"}
            </Button>
          </div>

          {/* +1 Projet */}
          <div className="p-4 rounded-lg border border-border/50 bg-muted/20 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <FolderPlus className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold">
                    {i18n.language === 'fr' ? "+1 Projet" : "+1 Project"}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {i18n.language === 'fr' 
                      ? "Ajoute un emplacement"
                      : "Adds a project slot"}
                  </p>
                </div>
              </div>
              <span className="text-lg font-bold">
                {hasUnlimitedProjects ? (
                  <span className="text-muted-foreground text-sm">Inclus</span>
                ) : (
                  `${projectPrice?.price || 29}€`
                )}
              </span>
            </div>
            <Button 
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleProjectPurchase}
              disabled={isLoading || hasUnlimitedProjects || projectPrice?.disabled}
            >
              {hasUnlimitedProjects || projectPrice?.disabled ? (
                <>
                  <Check className="h-4 w-4 mr-2 text-emerald-500" />
                  {i18n.language === 'fr' ? "Déjà inclus" : "Already included"}
                </>
              ) : isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <>
                  <FolderPlus className="h-4 w-4 mr-2" />
                  {i18n.language === 'fr' ? "Ajouter" : "Add"}
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
