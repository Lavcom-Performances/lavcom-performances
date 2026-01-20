import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Shield, 
  Archive, 
  Bell, 
  UserMinus, 
  Trash2, 
  KeyRound, 
  Loader2, 
  Save,
  Clock,
  Info,
  Download,
  FileText,
  Mail,
  Calendar,
  ExternalLink
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Link } from "react-router-dom";

interface AuditAlertPreferences {
  critical_actions_alerts: boolean;
  permission_change_alerts: boolean;
  member_removal_alerts: boolean;
  deletion_alerts: boolean;
  archive_before_deletion: boolean;
  audit_report_frequency: 'none' | 'weekly' | 'monthly';
  audit_report_email: string;
}

interface AuditArchive {
  id: string;
  file_path: string;
  records_count: number;
  date_range_start: string;
  date_range_end: string;
  file_size_bytes: number | null;
  created_at: string;
}

const defaultPreferences: AuditAlertPreferences = {
  critical_actions_alerts: true,
  permission_change_alerts: true,
  member_removal_alerts: true,
  deletion_alerts: true,
  archive_before_deletion: true,
  audit_report_frequency: 'none',
  audit_report_email: '',
};

const MIN_RETENTION = 7;
const MAX_RETENTION = 365;
const DEFAULT_RETENTION = 90;
const PRESET_VALUES = [7, 30, 90, 180, 365];

export default function AuditLogSettingsContent() {
  const { user, profile, updateProfile } = useAuth();
  const [preferences, setPreferences] = useState<AuditAlertPreferences>(defaultPreferences);
  const [retentionDays, setRetentionDays] = useState(DEFAULT_RETENTION);
  const [archives, setArchives] = useState<AuditArchive[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalPreferences, setOriginalPreferences] = useState<AuditAlertPreferences>(defaultPreferences);
  const [originalRetention, setOriginalRetention] = useState(DEFAULT_RETENTION);

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  useEffect(() => {
    if (profile?.log_retention_days) {
      setRetentionDays(profile.log_retention_days);
      setOriginalRetention(profile.log_retention_days);
    }
  }, [profile]);

  const fetchSettings = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch notification preferences
      const { data: notifData, error: notifError } = await supabase
        .from('notification_preferences')
        .select('critical_actions_alerts, permission_change_alerts, member_removal_alerts, deletion_alerts, archive_before_deletion, audit_report_frequency, audit_report_email')
        .eq('user_id', user.id)
        .maybeSingle();

      if (notifError) throw notifError;

      if (notifData) {
        const prefs: AuditAlertPreferences = {
          critical_actions_alerts: notifData.critical_actions_alerts ?? true,
          permission_change_alerts: notifData.permission_change_alerts ?? true,
          member_removal_alerts: notifData.member_removal_alerts ?? true,
          deletion_alerts: notifData.deletion_alerts ?? true,
          archive_before_deletion: notifData.archive_before_deletion ?? true,
          audit_report_frequency: (notifData.audit_report_frequency as 'none' | 'weekly' | 'monthly') ?? 'none',
          audit_report_email: notifData.audit_report_email ?? '',
        };
        setPreferences(prefs);
        setOriginalPreferences(prefs);
      }

      // Fetch archives
      const { data: archiveData, error: archiveError } = await supabase
        .from('audit_log_archives')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!archiveError && archiveData) {
        setArchives(archiveData);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key: keyof AuditAlertPreferences) => {
    const newPrefs = { ...preferences, [key]: !preferences[key] };
    setPreferences(newPrefs);
    checkForChanges(newPrefs, retentionDays);
  };

  const handleSliderChange = (value: number[]) => {
    setRetentionDays(value[0]);
    checkForChanges(preferences, value[0]);
  };

  const handlePresetClick = (days: number) => {
    setRetentionDays(days);
    checkForChanges(preferences, days);
  };

  const checkForChanges = (prefs: AuditAlertPreferences, retention: number) => {
    const prefsChanged = JSON.stringify(prefs) !== JSON.stringify(originalPreferences);
    const retentionChanged = retention !== originalRetention;
    setHasChanges(prefsChanged || retentionChanged);
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      // Update notification preferences
      const { error: notifError } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          ...preferences,
        }, {
          onConflict: 'user_id'
        });

      if (notifError) throw notifError;

      // Update retention days in profile
      const { error: profileError } = await updateProfile({
        log_retention_days: retentionDays
      } as any);

      if (profileError) throw profileError;

      setOriginalPreferences(preferences);
      setOriginalRetention(retentionDays);
      setHasChanges(false);
      toast.success("Paramètres enregistrés");
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const downloadArchive = async (archive: AuditArchive) => {
    try {
      const { data, error } = await supabase.storage
        .from('audit-archives')
        .download(archive.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = archive.file_path.split('/').pop() || 'audit-archive.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading archive:', error);
      toast.error("Erreur lors du téléchargement");
    }
  };

  const formatDays = (days: number) => {
    if (days === 7) return "1 semaine";
    if (days === 30) return "1 mois";
    if (days === 90) return "3 mois";
    if (days === 180) return "6 mois";
    if (days === 365) return "1 an";
    return `${days} jours`;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
      {/* Retention Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Rétention des journaux</CardTitle>
                <CardDescription className="text-xs">
                  Durée de conservation des journaux d'audit
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current value display */}
          <div className="text-center py-4">
            <span className="text-4xl font-bold text-primary">{retentionDays}</span>
            <span className="text-lg text-muted-foreground ml-2">jours</span>
            <p className="text-sm text-muted-foreground mt-1">
              {formatDays(retentionDays)}
            </p>
          </div>

          {/* Slider */}
          <div className="px-2">
            <Slider
              value={[retentionDays]}
              onValueChange={handleSliderChange}
              min={MIN_RETENTION}
              max={MAX_RETENTION}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>{MIN_RETENTION} jours</span>
              <span>{MAX_RETENTION} jours</span>
            </div>
          </div>

          {/* Preset buttons */}
          <div className="flex flex-wrap gap-2 justify-center">
            {PRESET_VALUES.map((days) => (
              <Button
                key={days}
                variant={retentionDays === days ? "default" : "outline"}
                size="sm"
                onClick={() => handlePresetClick(days)}
                className="text-xs"
              >
                {formatDays(days)}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Critical Action Alerts */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Alertes actions critiques</CardTitle>
              <CardDescription>
                Recevez des notifications pour les actions sensibles
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="criticalActions" className="font-medium">
                  Toutes les actions critiques
                </Label>
                <p className="text-sm text-muted-foreground">
                  Alerte globale pour toute action sensible
                </p>
              </div>
            </div>
            <Switch
              id="criticalActions"
              checked={preferences.critical_actions_alerts}
              onCheckedChange={() => handleToggle('critical_actions_alerts')}
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <KeyRound className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="permissionChange" className="font-medium">
                  Modifications de permissions
                </Label>
                <p className="text-sm text-muted-foreground">
                  Changements de rôles et de droits d'accès
                </p>
              </div>
            </div>
            <Switch
              id="permissionChange"
              checked={preferences.permission_change_alerts}
              onCheckedChange={() => handleToggle('permission_change_alerts')}
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <UserMinus className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="memberRemoval" className="font-medium">
                  Suppressions de membres
                </Label>
                <p className="text-sm text-muted-foreground">
                  Retrait de membres de l'équipe
                </p>
              </div>
            </div>
            <Switch
              id="memberRemoval"
              checked={preferences.member_removal_alerts}
              onCheckedChange={() => handleToggle('member_removal_alerts')}
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <Trash2 className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="deletion" className="font-medium">
                  Suppressions de données
                </Label>
                <p className="text-sm text-muted-foreground">
                  Suppression de sites, opérations, etc.
                </p>
              </div>
            </div>
            <Switch
              id="deletion"
              checked={preferences.deletion_alerts}
              onCheckedChange={() => handleToggle('deletion_alerts')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Scheduled Reports */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Rapports programmés</CardTitle>
                <CardDescription>
                  Recevez un résumé des actions critiques par email
                </CardDescription>
              </div>
            </div>
            <Link to="/audit-logs" className="text-sm text-primary hover:underline flex items-center gap-1">
              Voir mes journaux
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-sm text-muted-foreground mb-1.5 block">Fréquence</Label>
              <Select 
                value={preferences.audit_report_frequency} 
                onValueChange={(v) => {
                  const newPrefs = { ...preferences, audit_report_frequency: v as 'none' | 'weekly' | 'monthly' };
                  setPreferences(newPrefs);
                  checkForChanges(newPrefs, retentionDays);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Désactivé</SelectItem>
                  <SelectItem value="weekly">Hebdomadaire (lundi)</SelectItem>
                  <SelectItem value="monthly">Mensuel (1er du mois)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground mb-1.5 block">Email (optionnel)</Label>
              <Input
                type="email"
                placeholder={profile?.email || "votre@email.com"}
                value={preferences.audit_report_email}
                onChange={(e) => {
                  const newPrefs = { ...preferences, audit_report_email: e.target.value };
                  setPreferences(newPrefs);
                  checkForChanges(newPrefs, retentionDays);
                }}
              />
            </div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 flex items-start gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Les rapports incluent un résumé des suppressions, modifications de permissions et autres actions critiques de la période.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Archive Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Archivage automatique</CardTitle>
              <CardDescription>
                Conservez une copie des journaux avant leur suppression
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <Archive className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="archiveBeforeDeletion" className="font-medium">
                  Archiver avant suppression
                </Label>
                <p className="text-sm text-muted-foreground">
                  Exporter automatiquement les journaux expirés
                </p>
              </div>
            </div>
            <Switch
              id="archiveBeforeDeletion"
              checked={preferences.archive_before_deletion}
              onCheckedChange={() => handleToggle('archive_before_deletion')}
            />
          </div>

          {/* Info box */}
          <div className="p-3 rounded-lg bg-muted/50 flex items-start gap-2">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Les archives sont conservées dans un stockage sécurisé et peuvent être téléchargées à tout moment pour la conformité et les audits.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Archives List */}
      {archives.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Archives disponibles</CardTitle>
                <CardDescription>
                  Téléchargez vos journaux d'audit archivés
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {archives.map((archive) => (
                <div
                  key={archive.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        {format(new Date(archive.date_range_start), 'dd MMM yyyy', { locale: fr })} 
                        {' — '}
                        {format(new Date(archive.date_range_end), 'dd MMM yyyy', { locale: fr })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {archive.records_count} entrées • {formatFileSize(archive.file_size_bytes)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => downloadArchive(archive)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save button */}
      {hasChanges && (
        <div className="flex justify-end sticky bottom-4">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="gap-2 shadow-lg"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Enregistrer les modifications
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}