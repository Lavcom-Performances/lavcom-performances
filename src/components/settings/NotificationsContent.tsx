import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, Mail, Smartphone, TrendingDown, AlertTriangle, Calendar } from "lucide-react";

export default function NotificationsContent() {
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    pushAlerts: false,
    weeklyReport: true,
    maintenanceAlerts: true,
    revenueAlerts: false,
    trialReminder: true,
  });

  const handleToggle = (key: keyof typeof notifications) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Préférences de notification
          </CardTitle>
          <CardDescription>
            Configurez comment et quand vous souhaitez être notifié
          </CardDescription>
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
                checked={notifications.emailAlerts}
                onCheckedChange={() => handleToggle('emailAlerts')}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
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
                checked={notifications.pushAlerts}
                onCheckedChange={() => handleToggle('pushAlerts')}
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
                checked={notifications.weeklyReport}
                onCheckedChange={() => handleToggle('weeklyReport')}
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
                checked={notifications.maintenanceAlerts}
                onCheckedChange={() => handleToggle('maintenanceAlerts')}
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
                checked={notifications.revenueAlerts}
                onCheckedChange={() => handleToggle('revenueAlerts')}
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
                checked={notifications.trialReminder}
                onCheckedChange={() => handleToggle('trialReminder')}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
