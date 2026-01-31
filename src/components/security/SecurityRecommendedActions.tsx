import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Shield, 
  Key, 
  Smartphone, 
  Bell, 
  LogOut, 
  CheckCircle2, 
  ChevronRight,
  Loader2 
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSecurityHealth } from '@/hooks/useSecurityHealth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface ActionConfig {
  id: string;
  icon: React.ElementType;
  onClick?: () => void;
  loading?: boolean;
}

interface SecurityRecommendedActionsProps {
  onOpenMfaSetup?: () => void;
  onOpenRecoveryCodes?: () => void;
  onOpenTrustedDevices?: () => void;
}

export function SecurityRecommendedActions({
  onOpenMfaSetup,
  onOpenRecoveryCodes,
  onOpenTrustedDevices,
}: SecurityRecommendedActionsProps) {
  const { t } = useTranslation(['app', 'common']);
  const { toast } = useToast();
  const { user } = useAuth();
  const { 
    recommendedActions, 
    isLoading, 
    notifyNewDeviceLogin, 
    setNotifyNewDeviceLogin,
    refetch 
  } = useSecurityHealth();

  const [togglingAlerts, setTogglingAlerts] = useState(false);
  const [revokingSessions, setRevokingSessions] = useState(false);

  const handleToggleAlerts = async () => {
    try {
      setTogglingAlerts(true);
      await setNotifyNewDeviceLogin(!notifyNewDeviceLogin);
      toast({
        title: notifyNewDeviceLogin 
          ? t('app:securityHealth.actions.alertsDisabled')
          : t('app:securityHealth.actions.alertsEnabled'),
      });
    } catch (err) {
      toast({
        title: t('common:error'),
        variant: 'destructive',
      });
    } finally {
      setTogglingAlerts(false);
    }
  };

  const handleRevokeSessions = async () => {
    if (!user) return;
    
    try {
      setRevokingSessions(true);
      
      const { error } = await supabase.functions.invoke('revoke-other-sessions');
      
      if (error) throw error;

      toast({
        title: t('app:securityHealth.actions.sessionsRevoked'),
        description: t('app:securityHealth.actions.sessionsRevokedDescription'),
      });
      
      await refetch();
    } catch (err) {
      console.error('Error revoking sessions:', err);
      toast({
        title: t('common:error'),
        variant: 'destructive',
      });
    } finally {
      setRevokingSessions(false);
    }
  };

  const actionConfigs: Record<string, ActionConfig> = {
    enable_mfa: {
      id: 'enable_mfa',
      icon: Shield,
      onClick: onOpenMfaSetup,
    },
    generate_recovery_codes: {
      id: 'generate_recovery_codes',
      icon: Key,
      onClick: onOpenRecoveryCodes,
    },
    review_trusted_devices: {
      id: 'review_trusted_devices',
      icon: Smartphone,
      onClick: onOpenTrustedDevices,
    },
    enable_new_device_alerts: {
      id: 'enable_new_device_alerts',
      icon: Bell,
      onClick: handleToggleAlerts,
      loading: togglingAlerts,
    },
    revoke_sessions: {
      id: 'revoke_sessions',
      icon: LogOut,
      onClick: handleRevokeSessions,
      loading: revokingSessions,
    },
  };

  // Filter to show only incomplete actions + revoke sessions
  const incompleteActions = recommendedActions.filter(a => !a.completed);
  const showActions = [
    ...incompleteActions,
    { id: 'revoke_sessions', priority: 99, completed: false },
  ].slice(0, 5); // Max 5 actions

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // All actions completed
  if (incompleteActions.length === 0) {
    return (
      <Card className="border-green-500/30">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-lg">{t('app:securityHealth.actions.title')}</CardTitle>
              <CardDescription>{t('app:securityHealth.actions.allComplete')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Badge variant="outline" className="text-green-600 border-green-600/30 bg-green-500/5">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {t('app:securityHealth.actions.securityOptimized')}
            </Badge>
          </div>
          
          {/* Still show revoke sessions option */}
          <Button
            variant="outline"
            className="w-full mt-4"
            onClick={handleRevokeSessions}
            disabled={revokingSessions}
          >
            {revokingSessions ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4 mr-2" />
            )}
            {t('app:securityHealth.actions.revoke_sessions.label')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">{t('app:securityHealth.actions.title')}</CardTitle>
            <CardDescription>{t('app:securityHealth.actions.description')}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {showActions.map((action) => {
          const config = actionConfigs[action.id];
          if (!config) return null;

          const Icon = config.icon;
          const isCompleted = action.completed;

          return (
            <button
              key={action.id}
              onClick={config.onClick}
              disabled={config.loading || isCompleted}
              className={`w-full flex items-center gap-4 p-4 rounded-lg border transition-colors text-left ${
                isCompleted 
                  ? 'bg-green-500/5 border-green-500/20 opacity-60'
                  : 'hover:bg-muted/50 border-border'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                isCompleted ? 'bg-green-500/10' : 'bg-primary/10'
              }`}>
                {config.loading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                ) : isCompleted ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <Icon className="h-5 w-5 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">
                  {t(`app:securityHealth.actions.${action.id}.label`)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t(`app:securityHealth.actions.${action.id}.benefit`)}
                </p>
              </div>
              {!isCompleted && !config.loading && (
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
