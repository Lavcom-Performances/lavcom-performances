import { useEffect, useMemo, useState } from "react";
import {
  getOrganizationPrivacySettings,
  upsertOrganizationPrivacySettings,
  type OrganizationPrivacySettingsWithUser,
} from "@/lib/organizationPrivacySettings";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Loader2, HelpCircle, Clock, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export function PrivacyConsentCard() {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const organizationId = organization?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<OrganizationPrivacySettingsWithUser | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const value = settings?.allow_anonymous_site_data ?? false;

  const canWrite = useMemo(
    () => Boolean(user?.id && organizationId),
    [user?.id, organizationId]
  );

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!organizationId) return;
      try {
        setLoading(true);
        const data = await getOrganizationPrivacySettings(organizationId);
        if (!mounted) return;
        setSettings(data);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [organizationId]);

  async function onSave(next: boolean) {
    if (!user?.id || !organizationId) return;
    setSaving(true);
    try {
      const updatedSettings = await upsertOrganizationPrivacySettings({
        organizationId,
        allowAnonymousSiteData: next,
        decidedByUserId: user.id,
      });
      
      // Refetch to get the user info
      const fullSettings = await getOrganizationPrivacySettings(organizationId);
      setSettings(fullSettings);
      
      toast({
        title: "Préférence enregistrée",
        description: next 
          ? "Vous avez accepté le partage de données anonymes." 
          : "Vous avez refusé le partage de données.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer votre préférence. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  const formatLastUpdated = () => {
    if (!settings?.decided_at) return null;
    
    const date = new Date(settings.decided_at);
    const formattedDate = format(date, "d MMMM yyyy 'à' HH:mm", { locale: fr });
    
    const userName = settings.decided_by_user
      ? settings.decided_by_user.first_name && settings.decided_by_user.last_name
        ? `${settings.decided_by_user.first_name} ${settings.decided_by_user.last_name}`
        : settings.decided_by_user.email
      : null;
    
    return { formattedDate, userName };
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-96 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  const lastUpdatedInfo = formatLastUpdated();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-primary" />
          Accepteriez-vous de nous aider à améliorer nos services ?
        </CardTitle>
        <CardDescription>
          Pouvons-nous collecter des informations anonymes sur votre site afin d'améliorer
          votre expérience et celles des autres utilisateurs ?
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <RadioGroup
          value={value ? "yes" : "no"}
          onValueChange={(v) => onSave(v === "yes")}
          disabled={!canWrite || saving}
          className="space-y-3"
        >
          <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
            <RadioGroupItem value="no" id="consent-no" disabled={!canWrite || saving} />
            <Label
              htmlFor="consent-no"
              className="flex-1 cursor-pointer text-sm font-medium"
            >
              Non, je ne veux pas partager les données de mon site
            </Label>
            {saving && !value && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>

          <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
            <RadioGroupItem value="yes" id="consent-yes" disabled={!canWrite || saving} />
            <Label
              htmlFor="consent-yes"
              className="flex-1 cursor-pointer text-sm font-medium"
            >
              Oui, vous pouvez collecter les données de mon site
            </Label>
            {saving && value && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
        </RadioGroup>

        <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
          <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ${
                detailsOpen ? "rotate-180" : ""
              }`}
            />
            Quelles données seront collectées et pourquoi ?
          </CollapsibleTrigger>

          <CollapsibleContent className="mt-3">
            <div className="space-y-3 p-4 rounded-lg bg-muted/50 border border-border text-sm text-muted-foreground">
              <p>
                <strong className="text-foreground">Exemples (anonymes) :</strong> pages consultées,
                fonctionnalités utilisées, temps de chargement, erreurs techniques, type d'appareil
                et version de navigateur.
              </p>
              <p>
                <strong className="text-foreground">Objectif :</strong> détecter les bugs, améliorer
                la performance et prioriser les améliorations produit.
              </p>
              <p>
                <strong className="text-foreground">Important :</strong> nous ne vendrons pas ces
                données et nous ne collectons aucune donnée personnelle sur vous ou vos laveries.
              </p>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>

      {lastUpdatedInfo && (
        <CardFooter className="border-t pt-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Dernière modification : {lastUpdatedInfo.formattedDate}
            </span>
            {lastUpdatedInfo.userName && (
              <span className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                par {lastUpdatedInfo.userName}
              </span>
            )}
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
