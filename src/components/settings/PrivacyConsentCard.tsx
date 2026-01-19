import { Eye, EyeOff, Loader2, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganizationPrivacySettings } from "@/hooks/useOrganizationPrivacySettings";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export function PrivacyConsentCard() {
  const {
    settings,
    isLoading,
    isSaving,
    canManage,
    allowAnonymousSiteData,
    updateSettings,
  } = useOrganizationPrivacySettings();

  const handleToggle = async (checked: boolean) => {
    await updateSettings(checked);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {allowAnonymousSiteData ? (
            <Eye className="h-5 w-5 text-primary" />
          ) : (
            <EyeOff className="h-5 w-5 text-muted-foreground" />
          )}
          Partage de données anonymisées
        </CardTitle>
        <CardDescription>
          Contribuez à améliorer le service en partageant des données de performance anonymisées
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30">
          <div className="space-y-1 flex-1 pr-4">
            <Label 
              htmlFor="anonymous-data-toggle" 
              className="text-sm font-medium cursor-pointer"
            >
              Autoriser le partage de données anonymisées
            </Label>
            <p className="text-xs text-muted-foreground">
              Ces données sont utilisées uniquement pour améliorer nos benchmarks et ne contiennent aucune information identifiable.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isSaving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            <Switch
              id="anonymous-data-toggle"
              checked={allowAnonymousSiteData}
              onCheckedChange={handleToggle}
              disabled={!canManage || isSaving}
            />
          </div>
        </div>

        {!canManage && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-amber-500/10 border border-amber-500/20">
            <Info className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Seuls les administrateurs de l'organisation peuvent modifier ce paramètre.
            </p>
          </div>
        )}

        {settings?.decided_at && (
          <p className="text-xs text-muted-foreground">
            Dernière modification : {format(new Date(settings.decided_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
