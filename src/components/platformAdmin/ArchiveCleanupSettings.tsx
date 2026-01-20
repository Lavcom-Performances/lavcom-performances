import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Settings, Play, Trash2, Clock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface CleanupStats {
  archivesDeleted: number;
  storageFilesDeleted: number;
  totalSizeFreedBytes: number;
  totalSizeFreedFormatted: string;
  errors: string[];
}

interface CleanupResult {
  success: boolean;
  stats?: CleanupStats;
  message?: string;
  error?: string;
}

interface ArchiveCleanupSettingsProps {
  onCleanupComplete?: () => void;
}

// Retention presets in years
const RETENTION_PRESETS = [
  { label: '1 an', years: 1, days: 365 },
  { label: '2 ans', years: 2, days: 730 },
  { label: '3 ans', years: 3, days: 1095 },
  { label: '5 ans', years: 5, days: 1825 },
];

export function ArchiveCleanupSettings({ onCleanupComplete }: ArchiveCleanupSettingsProps) {
  const [retentionYears, setRetentionYears] = useState(2);
  const [isRunning, setIsRunning] = useState(false);
  const [lastResult, setLastResult] = useState<CleanupResult | null>(null);

  const retentionDays = retentionYears * 365;

  const handleRunCleanup = async () => {
    setIsRunning(true);
    setLastResult(null);

    try {
      const response = await supabase.functions.invoke('cleanup-audit-archives', {
        body: { retention_days: retentionDays },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Échec du nettoyage');
      }

      const result = response.data as CleanupResult;
      setLastResult(result);

      if (result.success) {
        const stats = result.stats;
        if (stats && stats.archivesDeleted > 0) {
          toast.success(
            `Nettoyage terminé: ${stats.archivesDeleted} archive(s) supprimée(s), ${stats.totalSizeFreedFormatted} libéré(s)`,
            { 
              duration: 8000,
              description: stats.errors.length > 0 
                ? `${stats.errors.length} erreur(s) rencontrée(s)` 
                : undefined,
            }
          );
        } else {
          toast.info('Aucune archive à supprimer', {
            description: `Aucune archive antérieure à ${retentionYears} an(s)`,
          });
        }
        onCleanupComplete?.();
      } else {
        toast.error(result.error || 'Échec du nettoyage');
      }
    } catch (error) {
      console.error('Cleanup error:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur inattendue');
      setLastResult({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Paramètres de Rétention des Archives
        </CardTitle>
        <CardDescription>
          Configurez la durée de conservation des archives et lancez un nettoyage manuel
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Retention slider */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm text-foreground">Durée de rétention</Label>
            <span className="text-sm font-medium text-primary">
              {retentionYears} an{retentionYears > 1 ? 's' : ''} ({retentionDays} jours)
            </span>
          </div>
          <Slider
            value={[retentionYears]}
            onValueChange={([value]) => setRetentionYears(value)}
            min={1}
            max={5}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1 an (min)</span>
            <span>5 ans (max)</span>
          </div>
        </div>

        {/* Presets */}
        <div className="flex flex-wrap gap-2">
          {RETENTION_PRESETS.map((preset) => (
            <Button
              key={preset.years}
              variant={retentionYears === preset.years ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRetentionYears(preset.years)}
              className="text-xs"
            >
              {preset.label}
            </Button>
          ))}
        </div>

        {/* Run cleanup button */}
        <div className="pt-2 border-t border-border">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">
                Le nettoyage supprimera toutes les archives créées il y a plus de{' '}
                <strong className="text-foreground">{retentionYears} an{retentionYears > 1 ? 's' : ''}</strong>.
                Cette action est irréversible.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  disabled={isRunning}
                  className="flex items-center gap-2 shrink-0"
                >
                  {isRunning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {isRunning ? 'Nettoyage en cours...' : 'Lancer le nettoyage'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-background border-border">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-foreground">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Confirmer le nettoyage
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-muted-foreground">
                    Vous êtes sur le point de supprimer toutes les archives créées il y a plus de{' '}
                    <strong>{retentionYears} an{retentionYears > 1 ? 's' : ''}</strong>.
                    <br /><br />
                    Cette action est <strong>irréversible</strong>. Les fichiers seront supprimés du stockage
                    et les enregistrements de la base de données seront effacés. Chaque suppression sera
                    consignée dans le journal d'audit.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="border-border">Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleRunCleanup}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Confirmer la suppression
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Last result display */}
        {lastResult && (
          <div className={`p-4 rounded-lg border ${
            lastResult.success 
              ? 'bg-green-50 border-green-200 dark:bg-green-500/10 dark:border-green-500/30' 
              : 'bg-red-50 border-red-200 dark:bg-red-500/10 dark:border-red-500/30'
          }`}>
            <div className="flex items-start gap-3">
              {lastResult.success ? (
                <Clock className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
              )}
              <div className="flex-1">
                <p className={`font-medium ${
                  lastResult.success 
                    ? 'text-green-800 dark:text-green-300' 
                    : 'text-red-800 dark:text-red-300'
                }`}>
                  {lastResult.success ? 'Nettoyage terminé' : 'Échec du nettoyage'}
                </p>
                {lastResult.success && lastResult.stats && (
                  <div className="mt-2 text-sm text-green-700 dark:text-green-400 space-y-1">
                    <p>• {lastResult.stats.archivesDeleted} archive(s) supprimée(s)</p>
                    <p>• {lastResult.stats.totalSizeFreedFormatted} d'espace libéré</p>
                    {lastResult.stats.errors.length > 0 && (
                      <p className="text-amber-600 dark:text-amber-400">
                        • {lastResult.stats.errors.length} erreur(s) rencontrée(s)
                      </p>
                    )}
                  </div>
                )}
                {lastResult.message && (
                  <p className="mt-1 text-sm text-muted-foreground">{lastResult.message}</p>
                )}
                {lastResult.error && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{lastResult.error}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Info about scheduled cleanup */}
        <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
          <p className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Un nettoyage automatique est programmé chaque dimanche à 4h00 UTC avec une rétention de 2 ans.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
