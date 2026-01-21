import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Shield, AlertTriangle, Power, RefreshCw, Loader2 } from 'lucide-react';

interface FeatureFlag {
  key: string;
  is_enabled: boolean;
  description: string | null;
  updated_at: string;
  updated_by: string | null;
}

const FLAG_LABELS: Record<string, { label: string; critical: boolean }> = {
  imports_enabled: { label: 'Imports CSV', critical: true },
  ai_enabled: { label: 'Fonctionnalités IA', critical: true },
  exports_enabled: { label: 'Exports de données', critical: false },
  stripe_checkout_enabled: { label: 'Paiements Stripe', critical: true },
  recompute_analytics_enabled: { label: 'Recalcul Analytics', critical: false },
  automated_dr_drill_enabled: { label: 'DR Drill automatisé', critical: false },
};

export function FeatureFlagsPanel() {
  const queryClient = useQueryClient();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [emergencyDialogOpen, setEmergencyDialogOpen] = useState(false);
  const [pendingToggle, setPendingToggle] = useState<{ key: string; newValue: boolean } | null>(null);

  // Check if current user is super_admin
  useEffect(() => {
    const checkRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('platform_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      setIsSuperAdmin(data?.role === 'super_admin');
    };
    checkRole();
  }, []);

  const { data: flags, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['feature-flags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_feature_flags')
        .select('*')
        .order('key');

      if (error) throw error;
      return data as FeatureFlag[];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const updateFlagMutation = useMutation({
    mutationFn: async ({ key, is_enabled }: { key: string; is_enabled: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('platform_feature_flags')
        .update({ 
          is_enabled, 
          updated_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('key', key);

      if (error) throw error;

      // Log to audit_logs
      await supabase.rpc('rpc_create_audit_log', {
        p_actor_id: user.id,
        p_action: 'FEATURE_FLAG_UPDATE',
        p_target_table: 'platform_feature_flags',
        p_target_id: key,
        p_metadata: { key, new_value: is_enabled }
      });

      // Log system event
      await supabase.rpc('rpc_log_system_event', {
        p_env: 'prod',
        p_source: 'feature_flag',
        p_severity: is_enabled ? 'info' : 'warn',
        p_code: is_enabled ? 'FEATURE_ENABLED' : 'FEATURE_DISABLED',
        p_message: `Feature flag ${key} ${is_enabled ? 'enabled' : 'disabled'}`,
        p_meta: { key, actor_id: user.id }
      });

      return { key, is_enabled };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
      toast.success(`${FLAG_LABELS[data.key]?.label || data.key} ${data.is_enabled ? 'activé' : 'désactivé'}`);
    },
    onError: (error) => {
      toast.error(`Erreur: ${error instanceof Error ? error.message : 'Échec de la mise à jour'}`);
    },
  });

  const emergencyDisableMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const criticalFlags = ['imports_enabled', 'ai_enabled', 'stripe_checkout_enabled'];
      
      for (const key of criticalFlags) {
        await supabase
          .from('platform_feature_flags')
          .update({ 
            is_enabled: false, 
            updated_by: user.id,
            updated_at: new Date().toISOString()
          })
          .eq('key', key);
      }

      // Log emergency action
      await supabase.rpc('rpc_create_audit_log', {
        p_actor_id: user.id,
        p_action: 'EMERGENCY_SAFE_MODE',
        p_target_table: 'platform_feature_flags',
        p_target_id: 'emergency',
        p_metadata: { disabled_flags: criticalFlags }
      });

      await supabase.rpc('rpc_log_system_event', {
        p_env: 'prod',
        p_source: 'feature_flag',
        p_severity: 'critical',
        p_code: 'EMERGENCY_SAFE_MODE',
        p_message: 'Emergency safe mode activated - critical features disabled',
        p_meta: { disabled_flags: criticalFlags, actor_id: user.id }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
      toast.warning('Mode d\'urgence activé - Imports, IA et Paiements désactivés');
      setEmergencyDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`Erreur: ${error instanceof Error ? error.message : 'Échec'}`);
    },
  });

  const handleToggle = (key: string, currentValue: boolean) => {
    if (!isSuperAdmin) {
      toast.error('Seuls les super admins peuvent modifier les feature flags');
      return;
    }

    const flagInfo = FLAG_LABELS[key];
    if (flagInfo?.critical && currentValue) {
      // Confirm before disabling critical flags
      setPendingToggle({ key, newValue: false });
    } else {
      updateFlagMutation.mutate({ key, is_enabled: !currentValue });
    }
  };

  const confirmToggle = () => {
    if (pendingToggle) {
      updateFlagMutation.mutate({ key: pendingToggle.key, is_enabled: pendingToggle.newValue });
      setPendingToggle(null);
    }
  };

  const allCriticalEnabled = flags?.every(f => 
    !FLAG_LABELS[f.key]?.critical || f.is_enabled
  ) ?? true;

  return (
    <>
      <Card className={!allCriticalEnabled ? 'border-orange-500' : ''}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <CardTitle>Feature Flags / Safe Mode</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => refetch()}
                disabled={isRefetching}
              >
                <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              </Button>
              {isSuperAdmin && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setEmergencyDialogOpen(true)}
                  disabled={emergencyDisableMutation.isPending}
                >
                  {emergencyDisableMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Power className="h-4 w-4 mr-2" />
                  )}
                  Mode Urgence
                </Button>
              )}
            </div>
          </div>
          <CardDescription>
            Activer/désactiver les fonctionnalités critiques en cas d'incident
            {!isSuperAdmin && (
              <span className="block text-orange-500 mt-1">
                Lecture seule - Modifications réservées aux super admins
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {flags?.map((flag) => {
                const info = FLAG_LABELS[flag.key];
                return (
                  <div
                    key={flag.key}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      !flag.is_enabled ? 'bg-orange-500/10 border-orange-500/50' : 'bg-muted/50'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{info?.label || flag.key}</span>
                        {info?.critical && (
                          <Badge variant="outline" className="text-xs">
                            Critique
                          </Badge>
                        )}
                        {!flag.is_enabled && (
                          <Badge variant="destructive" className="text-xs">
                            Désactivé
                          </Badge>
                        )}
                      </div>
                      {flag.description && (
                        <p className="text-sm text-muted-foreground mt-1">{flag.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Dernière modification: {formatDistanceToNow(new Date(flag.updated_at), { addSuffix: true, locale: fr })}
                      </p>
                    </div>
                    <Switch
                      checked={flag.is_enabled}
                      onCheckedChange={() => handleToggle(flag.key, flag.is_enabled)}
                      disabled={!isSuperAdmin || updateFlagMutation.isPending}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm disable critical flag dialog */}
      <AlertDialog open={!!pendingToggle} onOpenChange={() => setPendingToggle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Désactiver une fonctionnalité critique ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Vous êtes sur le point de désactiver <strong>{FLAG_LABELS[pendingToggle?.key || '']?.label}</strong>.
              Cela bloquera les utilisateurs qui tentent d'utiliser cette fonctionnalité.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmToggle} className="bg-orange-500 hover:bg-orange-600">
              Désactiver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Emergency mode confirmation dialog */}
      <AlertDialog open={emergencyDialogOpen} onOpenChange={setEmergencyDialogOpen}>
        <AlertDialogContent className="border-red-500">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-500">
              <Power className="h-5 w-5" />
              Activer le mode d'urgence ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Cette action désactivera immédiatement:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong>Imports CSV</strong> - Les utilisateurs ne pourront plus importer de données</li>
                <li><strong>Fonctionnalités IA</strong> - Toutes les requêtes IA seront bloquées</li>
                <li><strong>Paiements Stripe</strong> - Les checkouts seront désactivés</li>
              </ul>
              <p className="mt-4 text-orange-500 font-medium">
                Utilisez cette option uniquement en cas d'incident majeur.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => emergencyDisableMutation.mutate()}
              className="bg-red-500 hover:bg-red-600"
            >
              {emergencyDisableMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Activer le mode d'urgence
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
