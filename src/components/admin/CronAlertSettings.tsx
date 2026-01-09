import { useState, useEffect } from "react";
import { Settings, Save, Loader2, Bell, Mail, MessageSquare, Clock, AlertTriangle, AlertCircle, Webhook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface AlertSettings {
  id: string;
  job_name: string;
  failure_threshold: number;
  warning_threshold: number;
  critical_threshold: number;
  alert_cooldown_minutes: number;
  email_enabled: boolean;
  slack_enabled: boolean;
  last_alert_at: string | null;
  last_alert_severity: string | null;
  webhook_alert_threshold_hours: number;
}

export function CronAlertSettings() {
  const queryClient = useQueryClient();
  const [localSettings, setLocalSettings] = useState({
    warning_threshold: 3,
    critical_threshold: 5,
    alert_cooldown_minutes: 60,
    email_enabled: true,
    slack_enabled: true,
    webhook_alert_threshold_hours: 24,
  });

  // Fetch cron settings
  const { data: cronSettings, isLoading: loadingCron } = useQuery({
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

  // Fetch webhook settings
  const { data: webhookSettings, isLoading: loadingWebhook } = useQuery({
    queryKey: ['webhook-alert-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cron_alert_settings')
        .select('*')
        .eq('job_name', 'check-webhook-status')
        .maybeSingle();

      if (error) throw error;
      return data as AlertSettings | null;
    },
  });

  useEffect(() => {
    if (cronSettings) {
      setLocalSettings(prev => ({
        ...prev,
        warning_threshold: cronSettings.warning_threshold ?? 3,
        critical_threshold: cronSettings.critical_threshold ?? 5,
        alert_cooldown_minutes: cronSettings.alert_cooldown_minutes,
        email_enabled: cronSettings.email_enabled,
        slack_enabled: cronSettings.slack_enabled,
      }));
    }
    if (webhookSettings) {
      setLocalSettings(prev => ({
        ...prev,
        webhook_alert_threshold_hours: webhookSettings.webhook_alert_threshold_hours ?? 24,
      }));
    }
  }, [cronSettings, webhookSettings]);

  const updateCronMutation = useMutation({
    mutationFn: async (newSettings: typeof localSettings) => {
      const warningThreshold = Math.max(1, Math.min(10, newSettings.warning_threshold || 3));
      const criticalThreshold = Math.max(warningThreshold + 1, Math.min(15, newSettings.critical_threshold || 5));
      const cooldown = Math.max(5, Math.min(1440, newSettings.alert_cooldown_minutes || 60));

      if (cronSettings?.id) {
        const { error } = await supabase
          .from('cron_alert_settings')
          .update({
            warning_threshold: warningThreshold,
            critical_threshold: criticalThreshold,
            failure_threshold: warningThreshold,
            alert_cooldown_minutes: cooldown,
            email_enabled: newSettings.email_enabled ?? true,
            slack_enabled: newSettings.slack_enabled ?? true,
          })
          .eq('id', cronSettings.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('cron_alert_settings')
          .insert({
            job_name: 'compute-analytics-cron',
            warning_threshold: warningThreshold,
            critical_threshold: criticalThreshold,
            failure_threshold: warningThreshold,
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
        description: "Les seuils d'alerte cron ont été mis à jour.",
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

  const updateWebhookMutation = useMutation({
    mutationFn: async (thresholdHours: number) => {
      const validHours = Math.max(1, Math.min(168, thresholdHours)); // 1h to 7 days

      if (webhookSettings?.id) {
        const { error } = await supabase
          .from('cron_alert_settings')
          .update({
            webhook_alert_threshold_hours: validHours,
          })
          .eq('id', webhookSettings.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('cron_alert_settings')
          .insert({
            job_name: 'check-webhook-status',
            webhook_alert_threshold_hours: validHours,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhook-alert-settings'] });
      toast({
        title: "Paramètres sauvegardés",
        description: "Le seuil d'alerte webhook a été mis à jour.",
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

  const handleSaveCron = () => {
    const adjustedSettings = {
      ...localSettings,
      critical_threshold: Math.max(localSettings.warning_threshold + 1, localSettings.critical_threshold)
    };
    updateCronMutation.mutate(adjustedSettings);
  };

  const handleSaveWebhook = () => {
    updateWebhookMutation.mutate(localSettings.webhook_alert_threshold_hours);
  };

  const isLoading = loadingCron || loadingWebhook;

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
          Configuration des alertes
        </CardTitle>
        <CardDescription>
          Gérez les seuils et canaux de notification pour les différents types d'alertes
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="cron" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="cron" className="gap-2">
              <Clock className="h-4 w-4" />
              Alertes Cron
            </TabsTrigger>
            <TabsTrigger value="webhook" className="gap-2">
              <Webhook className="h-4 w-4" />
              Alertes Webhook
            </TabsTrigger>
          </TabsList>

          {/* Cron Alerts Tab */}
          <TabsContent value="cron" className="space-y-6">
            {/* Severity Thresholds */}
            <div className="space-y-4">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <AlertTriangle className="h-4 w-4" />
                Seuils de sévérité
              </Label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Warning threshold */}
                <div className="p-4 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/50 dark:text-amber-400">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Warning
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="warning-threshold" className="text-sm text-muted-foreground">
                      Échecs consécutifs
                    </Label>
                    <Input
                      id="warning-threshold"
                      type="number"
                      min={1}
                      max={10}
                      value={localSettings.warning_threshold}
                      onChange={(e) => setLocalSettings(prev => ({
                        ...prev,
                        warning_threshold: parseInt(e.target.value) || 3
                      }))}
                      className="max-w-[100px] bg-background"
                    />
                    <p className="text-xs text-muted-foreground">
                      Première alerte envoyée (1-10)
                    </p>
                  </div>
                </div>

                {/* Critical threshold */}
                <div className="p-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800 space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300 dark:bg-red-900/50 dark:text-red-400">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Critique
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="critical-threshold" className="text-sm text-muted-foreground">
                      Échecs consécutifs
                    </Label>
                    <Input
                      id="critical-threshold"
                      type="number"
                      min={localSettings.warning_threshold + 1}
                      max={15}
                      value={localSettings.critical_threshold}
                      onChange={(e) => setLocalSettings(prev => ({
                        ...prev,
                        critical_threshold: parseInt(e.target.value) || 5
                      }))}
                      className="max-w-[100px] bg-background"
                    />
                    <p className="text-xs text-muted-foreground">
                      Alerte critique (min: {localSettings.warning_threshold + 1})
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Cooldown */}
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
                value={localSettings.alert_cooldown_minutes}
                onChange={(e) => setLocalSettings(prev => ({
                  ...prev,
                  alert_cooldown_minutes: parseInt(e.target.value) || 60
                }))}
                className="max-w-[120px]"
              />
              <p className="text-xs text-muted-foreground">
                Temps minimum entre deux alertes de même sévérité (5-1440 min)
              </p>
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
                    checked={localSettings.email_enabled}
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
                    checked={localSettings.slack_enabled}
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
            {cronSettings?.last_alert_at && (
              <div className="text-sm text-muted-foreground border-t pt-4 flex items-center gap-2">
                Dernière alerte : 
                {cronSettings.last_alert_severity && (
                  <Badge variant="outline" className={
                    cronSettings.last_alert_severity === 'critical' 
                      ? 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/50 dark:text-red-400'
                      : 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/50 dark:text-amber-400'
                  }>
                    {cronSettings.last_alert_severity === 'critical' ? 'Critique' : 'Warning'}
                  </Badge>
                )}
                {format(new Date(cronSettings.last_alert_at), "dd MMM yyyy à HH:mm", { locale: fr })}
              </div>
            )}

            {/* Save button */}
            <div className="flex justify-end pt-2">
              <Button
                onClick={handleSaveCron}
                disabled={updateCronMutation.isPending}
                className="gap-2"
              >
                {updateCronMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Enregistrer
              </Button>
            </div>
          </TabsContent>

          {/* Webhook Alerts Tab */}
          <TabsContent value="webhook" className="space-y-6">
            <div className="p-4 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/50 dark:text-blue-400">
                  <Webhook className="h-3 w-3 mr-1" />
                  Stripe Webhook
                </Badge>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="webhook-threshold" className="text-sm font-medium">
                  Seuil d'alerte de silence (heures)
                </Label>
                <p className="text-sm text-muted-foreground">
                  Envoyer une alerte si aucun événement Stripe n'est reçu pendant cette durée
                </p>
                <Input
                  id="webhook-threshold"
                  type="number"
                  min={1}
                  max={168}
                  value={localSettings.webhook_alert_threshold_hours}
                  onChange={(e) => setLocalSettings(prev => ({
                    ...prev,
                    webhook_alert_threshold_hours: parseInt(e.target.value) || 24
                  }))}
                  className="max-w-[120px] bg-background"
                />
                <p className="text-xs text-muted-foreground">
                  Valeurs suggérées : 24h (actif), 48h (modéré), 72h (faible trafic)
                </p>
              </div>

              <div className="text-sm text-muted-foreground pt-2 border-t">
                <p className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  L'alerte n'est envoyée que si le webhook était actif auparavant (au moins 1 événement enregistré)
                </p>
              </div>
            </div>

            {/* Last webhook alert info */}
            {webhookSettings?.last_alert_at && (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                Dernière alerte webhook : 
                {format(new Date(webhookSettings.last_alert_at), "dd MMM yyyy à HH:mm", { locale: fr })}
              </div>
            )}

            {/* Save button */}
            <div className="flex justify-end pt-2">
              <Button
                onClick={handleSaveWebhook}
                disabled={updateWebhookMutation.isPending}
                className="gap-2"
              >
                {updateWebhookMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Enregistrer
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
