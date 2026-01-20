import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { 
  Loader2, 
  Trash2,
  AlertTriangle,
  Clock,
  Shield,
} from 'lucide-react';
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
} from "@/components/ui/alert-dialog";

interface ComplianceRetentionSettingsProps {
  onCleanupComplete?: () => void;
}

export function ComplianceRetentionSettings({ onCleanupComplete }: ComplianceRetentionSettingsProps) {
  const [retentionYears, setRetentionYears] = useState(2);
  const [isRunningCleanup, setIsRunningCleanup] = useState(false);

  const handleRunCleanup = async () => {
    setIsRunningCleanup(true);

    try {
      const response = await supabase.functions.invoke('cleanup-compliance-reports', {
        body: {
          retention_years: retentionYears,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Échec du nettoyage');
      }

      const data = response.data;
      if (!data.success) {
        throw new Error(data.error || 'Échec du nettoyage');
      }

      if (data.deleted_count === 0) {
        toast.info('Aucun rapport à supprimer');
      } else {
        toast.success(
          `${data.deleted_count} rapport(s) supprimé(s)`,
          { duration: 5000 }
        );
        onCleanupComplete?.();
      }
    } catch (error) {
      console.error('Cleanup error:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur inattendue');
    } finally {
      setIsRunningCleanup(false);
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Rétention des Rapports
        </CardTitle>
        <CardDescription>
          Gérez la durée de conservation des rapports de conformité
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Retention Slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Durée de rétention
            </label>
            <span className="text-sm font-medium text-foreground">
              {retentionYears} an{retentionYears > 1 ? 's' : ''}
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
            <span>1 an</span>
            <span>5 ans</span>
          </div>
        </div>

        {/* Manual Cleanup */}
        <div className="pt-4 border-t border-border">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">Zone de danger</p>
              <p className="text-xs text-muted-foreground mt-1">
                Les rapports supprimés ne peuvent pas être récupérés.
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    className="mt-3"
                    disabled={isRunningCleanup}
                  >
                    {isRunningCleanup ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                        Nettoyage...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-1.5" />
                        Nettoyer maintenant
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      Confirmer le nettoyage
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action supprimera définitivement tous les rapports de conformité 
                      datant de plus de <strong>{retentionYears} an{retentionYears > 1 ? 's' : ''}</strong>.
                      <br /><br />
                      Les fichiers associés seront également supprimés du stockage.
                      Cette action est irréversible.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleRunCleanup}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Supprimer les anciens rapports
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
