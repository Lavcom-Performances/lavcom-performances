import { useTranslation } from 'react-i18next';
import { Shield, ShieldCheck, ShieldAlert, ShieldX, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useSecurityHealth } from '@/hooks/useSecurityHealth';

export function SecurityHealthCard() {
  const { t } = useTranslation(['app']);
  const { score, isLoading } = useSecurityHealth();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!score) {
    return null;
  }

  const getStatusConfig = () => {
    switch (score.status) {
      case 'good':
        return {
          icon: ShieldCheck,
          color: 'text-green-600',
          bgColor: 'bg-green-500/10',
          borderColor: 'border-green-500/30',
          progressColor: '[&>div]:bg-green-500',
          badgeVariant: 'default' as const,
          badgeClass: 'bg-green-500 hover:bg-green-500/90',
        };
      case 'needs_improvement':
        return {
          icon: ShieldAlert,
          color: 'text-amber-600',
          bgColor: 'bg-amber-500/10',
          borderColor: 'border-amber-500/30',
          progressColor: '[&>div]:bg-amber-500',
          badgeVariant: 'secondary' as const,
          badgeClass: 'bg-amber-500 text-white hover:bg-amber-500/90',
        };
      case 'at_risk':
        return {
          icon: ShieldX,
          color: 'text-destructive',
          bgColor: 'bg-destructive/10',
          borderColor: 'border-destructive/30',
          progressColor: '[&>div]:bg-destructive',
          badgeVariant: 'destructive' as const,
          badgeClass: '',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <Card className={`${config.borderColor} border-2`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${config.bgColor}`}>
              <Icon className={`h-7 w-7 ${config.color}`} />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {t('app:securityHealth.title')}
                <Badge className={config.badgeClass} variant={config.badgeVariant}>
                  {t(`app:securityHealth.status.${score.status}`)}
                </Badge>
              </CardTitle>
              <CardDescription className="mt-1">
                {t('app:securityHealth.description')}
              </CardDescription>
            </div>
          </div>
          <div className="text-right">
            <span className={`text-4xl font-bold ${config.color}`}>
              {score.score}
            </span>
            <span className="text-2xl text-muted-foreground">/100</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Progress 
          value={score.score} 
          className={`h-3 ${config.progressColor}`}
        />
        
        {/* Score breakdown - compact view */}
        <div className="flex flex-wrap gap-2 mt-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-muted-foreground/40" />
            Base: {score.breakdown.base}
          </span>
          {score.breakdown.mfa > 0 && (
            <span className="flex items-center gap-1 text-green-600">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              MFA: +{score.breakdown.mfa}
            </span>
          )}
          {score.breakdown.recoveryCodes > 0 && (
            <span className="flex items-center gap-1 text-green-600">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              {t('app:securityHealth.breakdown.recoveryCodes')}: +{score.breakdown.recoveryCodes}
            </span>
          )}
          {score.breakdown.trustedDevices > 0 && (
            <span className="flex items-center gap-1 text-green-600">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              {t('app:securityHealth.breakdown.trustedDevices')}: +{score.breakdown.trustedDevices}
            </span>
          )}
          {score.breakdown.riskyLoginsPenalty < 0 && (
            <span className="flex items-center gap-1 text-destructive">
              <span className="w-2 h-2 rounded-full bg-destructive" />
              {t('app:securityHealth.breakdown.riskyLogins')}: {score.breakdown.riskyLoginsPenalty}
            </span>
          )}
          {score.breakdown.otpFailuresPenalty < 0 && (
            <span className="flex items-center gap-1 text-destructive">
              <span className="w-2 h-2 rounded-full bg-destructive" />
              {t('app:securityHealth.breakdown.otpFailures')}: {score.breakdown.otpFailuresPenalty}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
