import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, Mail, Trash2, Plus, TestTube } from "lucide-react";
import { toast } from "sonner";

interface ChurnAlertSettingsData {
  id: string;
  churn_threshold: number;
  email_enabled: boolean;
  recipient_emails: string[];
  last_alert_at: string | null;
  alert_cooldown_hours: number;
}

export function ChurnAlertSettings() {
  const queryClient = useQueryClient();
  const [threshold, setThreshold] = useState(5);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [cooldownHours, setCooldownHours] = useState(24);
  const [emails, setEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState("");

  const { data: settings, isLoading } = useQuery({
    queryKey: ["churnAlertSettings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("churn_alert_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data as ChurnAlertSettingsData | null;
    },
  });

  useEffect(() => {
    if (settings) {
      setThreshold(settings.churn_threshold);
      setEmailEnabled(settings.email_enabled);
      setCooldownHours(settings.alert_cooldown_hours);
      setEmails(settings.recipient_emails || []);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        churn_threshold: threshold,
        email_enabled: emailEnabled,
        alert_cooldown_hours: cooldownHours,
        recipient_emails: emails,
      };

      if (settings?.id) {
        const { error } = await supabase
          .from("churn_alert_settings")
          .update(payload)
          .eq("id", settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("churn_alert_settings")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["churnAlertSettings"] });
      toast.success("Paramètres d'alerte sauvegardés");
    },
    onError: (error) => {
      console.error("Error saving settings:", error);
      toast.error("Erreur lors de la sauvegarde");
    },
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("check-churn-alert");
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Test effectué: ${data.message || "OK"}`);
    },
    onError: (error) => {
      console.error("Error testing alert:", error);
      toast.error("Erreur lors du test");
    },
  });

  const addEmail = () => {
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error("Email invalide");
      return;
    }
    if (emails.includes(trimmed)) {
      toast.error("Email déjà ajouté");
      return;
    }
    setEmails([...emails, trimmed]);
    setNewEmail("");
  };

  const removeEmail = (email: string) => {
    setEmails(emails.filter(e => e !== email));
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4" />
            <div className="h-10 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Alertes Churn
        </CardTitle>
        <CardDescription>
          Recevez une alerte email quand le nombre de désabonnements dépasse un seuil
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Activer les alertes email</Label>
            <p className="text-sm text-muted-foreground">
              Envoyer des notifications par email
            </p>
          </div>
          <Switch
            checked={emailEnabled}
            onCheckedChange={setEmailEnabled}
          />
        </div>

        {/* Threshold */}
        <div className="space-y-2">
          <Label htmlFor="threshold">Seuil d'alerte (désabonnements/mois)</Label>
          <Input
            id="threshold"
            type="number"
            min={1}
            value={threshold}
            onChange={(e) => setThreshold(parseInt(e.target.value) || 1)}
            className="max-w-[200px]"
          />
          <p className="text-sm text-muted-foreground">
            Une alerte sera envoyée quand ce nombre est atteint
          </p>
        </div>

        {/* Cooldown */}
        <div className="space-y-2">
          <Label htmlFor="cooldown">Délai entre alertes (heures)</Label>
          <Input
            id="cooldown"
            type="number"
            min={1}
            value={cooldownHours}
            onChange={(e) => setCooldownHours(parseInt(e.target.value) || 1)}
            className="max-w-[200px]"
          />
          <p className="text-sm text-muted-foreground">
            Temps minimum entre deux alertes
          </p>
        </div>

        {/* Recipients */}
        <div className="space-y-2">
          <Label>Destinataires</Label>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="email@exemple.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addEmail()}
            />
            <Button type="button" variant="outline" onClick={addEmail}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {emails.map((email) => (
              <Badge key={email} variant="secondary" className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {email}
                <button
                  type="button"
                  onClick={() => removeEmail(email)}
                  className="ml-1 hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {emails.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Aucun destinataire configuré
              </p>
            )}
          </div>
        </div>

        {/* Last alert info */}
        {settings?.last_alert_at && (
          <div className="text-sm text-muted-foreground">
            Dernière alerte envoyée: {new Date(settings.last_alert_at).toLocaleString('fr-FR')}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-4">
          <Button 
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            Sauvegarder
          </Button>
          <Button
            variant="outline"
            onClick={() => testMutation.mutate()}
            disabled={testMutation.isPending || !emailEnabled || emails.length === 0}
          >
            <TestTube className="h-4 w-4 mr-2" />
            Tester l'alerte
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
