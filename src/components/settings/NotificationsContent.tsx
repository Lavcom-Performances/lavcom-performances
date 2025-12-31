import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, Mail, Smartphone, TrendingDown, AlertTriangle, Calendar, Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface NotificationPreferences {
  email_alerts: boolean;
  push_alerts: boolean;
  weekly_report: boolean;
  maintenance_alerts: boolean;
  revenue_alerts: boolean;
  trial_reminder: boolean;
}

const defaultPreferences: NotificationPreferences = {
  email_alerts: true,
  push_alerts: false,
  weekly_report: true,
  maintenance_alerts: true,
  revenue_alerts: false,
  trial_reminder: true,
};

export default function NotificationsContent() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalPreferences, setOriginalPreferences] = useState<NotificationPreferences>(defaultPreferences);

  useEffect(() => {
    if (user) {
      fetchPreferences();
    }
  }, [user]);

  const fetchPreferences = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const prefs: NotificationPreferences = {
          email_alerts: data.email_alerts,
          push_alerts: data.push_alerts,
          weekly_report: data.weekly_report,
          maintenance_alerts: data.maintenance_alerts,
          revenue_alerts: data.revenue_alerts,
          trial_reminder: data.trial_reminder,
        };
        setPreferences(prefs);
        setOriginalPreferences(prefs);
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key: keyof NotificationPreferences) => {
    const newPrefs = { ...preferences, [key]: !preferences[key] };
    setPreferences(newPrefs);
    setHasChanges(JSON.stringify(newPrefs) !== JSON.stringify(originalPreferences));
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          ...preferences,
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      setOriginalPreferences(preferences);
      setHasChanges(false);
      toast.success("Préférences enregistrées");
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Préférences de notification</CardTitle>
                <CardDescription>
                  Configurez comment et quand vous souhaitez être notifié
                </CardDescription>
              </div>
            </div>
            {hasChanges && (
              <Button onClick={handleSave} disabled={saving} size="sm">
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Enregistrer
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email Notifications */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
              Canaux de notification
            </h3>
            
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label htmlFor="emailAlerts" className="font-medium">
                    Notifications par email
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Recevez les alertes importantes par email
                  </p>
                </div>
              </div>
              <Switch
                id="emailAlerts"
                checked={preferences.email_alerts}
                onCheckedChange={() => handleToggle('email_alerts')}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg opacity-50">
              <div className="flex items-center gap-3">
                <Smartphone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label htmlFor="pushAlerts" className="font-medium">
                    Notifications push
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Recevez les alertes en temps réel (bientôt disponible)
                  </p>
                </div>
              </div>
              <Switch
                id="pushAlerts"
                checked={preferences.push_alerts}
                onCheckedChange={() => handleToggle('push_alerts')}
                disabled
              />
            </div>
          </div>

          {/* Alert Types */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
              Types d'alertes
            </h3>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label htmlFor="weeklyReport" className="font-medium">
                    Rapport hebdomadaire
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Résumé de vos performances chaque semaine
                  </p>
                </div>
              </div>
              <Switch
                id="weeklyReport"
                checked={preferences.weekly_report}
                onCheckedChange={() => handleToggle('weekly_report')}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label htmlFor="maintenanceAlerts" className="font-medium">
                    Alertes de maintenance
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Quand une machine nécessite une maintenance
                  </p>
                </div>
              </div>
              <Switch
                id="maintenanceAlerts"
                checked={preferences.maintenance_alerts}
                onCheckedChange={() => handleToggle('maintenance_alerts')}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <TrendingDown className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label htmlFor="revenueAlerts" className="font-medium">
                    Alertes de revenus
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Quand vos revenus baissent significativement
                  </p>
                </div>
              </div>
              <Switch
                id="revenueAlerts"
                checked={preferences.revenue_alerts}
                onCheckedChange={() => handleToggle('revenue_alerts')}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label htmlFor="trialReminder" className="font-medium">
                    Rappel fin d'essai
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Rappel avant la fin de votre période d'essai
                  </p>
                </div>
              </div>
              <Switch
                id="trialReminder"
                checked={preferences.trial_reminder}
                onCheckedChange={() => handleToggle('trial_reminder')}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
