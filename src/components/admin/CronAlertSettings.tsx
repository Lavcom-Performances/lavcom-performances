import { useState, useEffect } from "react";
import { Settings, Save, Loader2, Bell, Mail, MessageSquare, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface AlertSettings {
  id: string;
  job_name: string;
  failure_threshold: number;
  alert_cooldown_minutes: number;
  email_enabled: boolean;
  slack_enabled: boolean;
  last_alert_at: string | null;
}

export function CronAlertSettings() {
  const queryClient = useQueryClient();
  const [localSettings, setLocalSettings] = useState<Partial<AlertSettings>>({
    failure_threshold: 3,
    alert_cooldown_minutes: 60,
    email_enabled: true,
    slack_enabled: true,
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ['cron-alert-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cron_alert_settings')
        .select('*')
        .eq('job_name', 'compute-analytics-cron')
        .maybeSingle();

      if (error) throw error;
      return data as AlertSettings | null;
    },
  });

  useEffect(() => {
    if (settings) {
      setLocalSettings({
        failure_threshold: settings.failure_threshold,
        alert_cooldown_minutes: settings.alert_cooldown_minutes,
        email_enabled: settings.email_enabled,
        slack_enabled: settings.slack_enabled,
      });
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async (newSettings: Partial<AlertSettings>) => {
      // Validate inputs
      const threshold = Math.max(1, Math.min(10, newSettings.failure_threshold || 3));
      const cooldown = Math.max(5, Math.min(1440, newSettings.alert_cooldown_minutes || 60));

      if (settings?.id) {
        const { error } = await supabase
          .from('cron_alert_settings')
          .update({
            failure_threshold: threshold,
            alert_cooldown_minutes: cooldown,
            email_enabled: newSettings.email_enabled ?? true,
            slack_enabled: newSettings.slack_enabled ?? true,
          })
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('cron_alert_settings')
          .insert({
            job_name: 'compute-analytics-cron',
            failure_threshold: threshold,
            alert_cooldown_minutes: cooldown,
            email_enabled: newSettings.email_enabled ?? true,
            slack_enabled: newSettings.slack_enabled ?? true,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cron-alert-settings'] });
      toast({
        title: "Paramètres sauvegardés",
        description: "Les seuils d'alerte ont été mis à jour.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de sauvegarder",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateMutation.mutate(localSettings);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings className="h-5 w-5" />
          Paramètres d'alerte
        </CardTitle>
        <CardDescription>
          Configurez les seuils et canaux de notification pour les alertes cron
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Thresholds */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="failure-threshold" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Seuil d'échecs consécutifs
            </Label>
            <Input
              id="failure-threshold"
              type="number"
              min={1}
              max={10}
              value={localSettings.failure_threshold || 3}
              onChange={(e) => setLocalSettings(prev => ({
                ...prev,
                failure_threshold: parseInt(e.target.value) || 3
              }))}
              className="max-w-[120px]"
            />
            <p className="text-xs text-muted-foreground">
              Nombre d'échecs avant d'envoyer une alerte (1-10)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cooldown" className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Délai entre alertes (minutes)
            </Label>
            <Input
              id="cooldown"
              type="number"
              min={5}
              max={1440}
              value={localSettings.alert_cooldown_minutes || 60}
              onChange={(e) => setLocalSettings(prev => ({
                ...prev,
                alert_cooldown_minutes: parseInt(e.target.value) || 60
              }))}
              className="max-w-[120px]"
            />
            <p className="text-xs text-muted-foreground">
              Temps minimum entre deux alertes (5-1440 min)
            </p>
          </div>
        </div>

        {/* Notification Channels */}
        <div className="space-y-4">
          <Label className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Canaux de notification
          </Label>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
              <Switch
                id="email-enabled"
                checked={localSettings.email_enabled ?? true}
                onCheckedChange={(checked) => setLocalSettings(prev => ({
                  ...prev,
                  email_enabled: checked
                }))}
              />
              <Label htmlFor="email-enabled" className="flex items-center gap-2 cursor-pointer">
                <Mail className="h-4 w-4 text-primary" />
                Email
              </Label>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
              <Switch
                id="slack-enabled"
                checked={localSettings.slack_enabled ?? true}
                onCheckedChange={(checked) => setLocalSettings(prev => ({
                  ...prev,
                  slack_enabled: checked
                }))}
              />
              <Label htmlFor="slack-enabled" className="flex items-center gap-2 cursor-pointer">
                <MessageSquare className="h-4 w-4 text-[#4A154B]" />
                Slack
              </Label>
            </div>
          </div>
        </div>

        {/* Last alert info */}
        {settings?.last_alert_at && (
          <div className="text-sm text-muted-foreground border-t pt-4">
            Dernière alerte envoyée : {format(new Date(settings.last_alert_at), "dd MMM yyyy à HH:mm", { locale: fr })}
          </div>
        )}

        {/* Save button */}
        <div className="flex justify-end pt-2">
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="gap-2"
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Enregistrer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
