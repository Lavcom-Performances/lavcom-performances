import { useState, useEffect } from "react";
import { 
  Shield, 
  Loader2,
  User,
  Building2
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { SecurityAccountChecklist } from "./SecurityAccountChecklist";
import { SecurityProjectChecklist } from "./SecurityProjectChecklist";
import { LoginHistory } from "./LoginHistory";
import { LogRetentionSettings } from "./LogRetentionSettings";
import { AuthSecurityAuditLog } from "./AuthSecurityAuditLog";
import { TrustedDevicesManager } from "./TrustedDevicesManager";
import { RecoveryCodesManager } from "./RecoveryCodesManager";

export interface SecurityScore {
  score: number;
  total: number;
  percent: number;
}

export function SecurityCenter() {
  const { t } = useTranslation(['app', 'common']);
  const { user, isEmailVerified } = useAuth();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isMFAEnabled, setIsMFAEnabled] = useState(false);
  const [accountScore, setAccountScore] = useState<SecurityScore>({ score: 0, total: 0, percent: 0 });
  const [projectScore, setProjectScore] = useState<SecurityScore>({ score: 0, total: 0, percent: 0 });

  useEffect(() => {
    const checkSecurityStatus = async () => {
      setIsLoading(true);
      
      try {
        // Check MFA status
        const { data: mfaData } = await supabase.auth.mfa.listFactors();
        const verifiedFactor = mfaData?.totp?.find(f => f.status === 'verified');
        setIsMFAEnabled(!!verifiedFactor);
      } catch (error) {
        console.error('Error checking security status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      checkSecurityStatus();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  // Calculate global score with weighting
  const calculateGlobalScore = () => {
    // Account = 50%, Project = 50%
    const accountPercent = accountScore.percent;
    const projectPercent = projectScore.percent;
    return Math.round((accountPercent + projectPercent) / 2);
  };

  const globalScore = calculateGlobalScore();

  const getScoreColor = (percent: number) => {
    if (percent === 100) return 'text-green-600';
    if (percent >= 50) return 'text-amber-600';
    return 'text-destructive';
  };

  const getScoreBgColor = (percent: number) => {
    if (percent === 100) return 'bg-green-500/10';
    if (percent >= 50) return 'bg-amber-500/10';
    return 'bg-destructive/10';
  };

  const getProgressColor = (percent: number) => {
    if (percent === 100) return '[&>div]:bg-green-500';
    if (percent >= 50) return '[&>div]:bg-amber-500';
    return '[&>div]:bg-destructive';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Global Score Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${getScoreBgColor(globalScore)}`}>
                <Shield className={`h-8 w-8 ${getScoreColor(globalScore)}`} />
              </div>
              <div>
                <CardTitle className="text-xl">{t('app:securityCenter.title')}</CardTitle>
                <CardDescription>{t('app:securityCenter.description')}</CardDescription>
              </div>
            </div>
            <div className="text-right">
              <span className={`text-4xl font-bold ${getScoreColor(globalScore)}`}>
                {globalScore}%
              </span>
              <p className="text-sm text-muted-foreground">{t('app:securityCenter.globalScore')}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Global progress */}
          <Progress 
            value={globalScore} 
            className={`h-3 ${getProgressColor(globalScore)}`}
          />
          
          {/* Sub-scores */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* Account Score */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getScoreBgColor(accountScore.percent)}`}>
                <User className={`h-5 w-5 ${getScoreColor(accountScore.percent)}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t('app:securityCenter.accountScore')}</span>
                  <span className={`text-lg font-bold ${getScoreColor(accountScore.percent)}`}>
                    {accountScore.percent}%
                  </span>
                </div>
                <Progress 
                  value={accountScore.percent} 
                  className={`h-1.5 mt-1 ${getProgressColor(accountScore.percent)}`}
                />
              </div>
            </div>

            {/* Project Score */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getScoreBgColor(projectScore.percent)}`}>
                <Building2 className={`h-5 w-5 ${getScoreColor(projectScore.percent)}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t('app:securityCenter.projectScore')}</span>
                  <span className={`text-lg font-bold ${getScoreColor(projectScore.percent)}`}>
                    {projectScore.percent}%
                  </span>
                </div>
                <Progress 
                  value={projectScore.percent} 
                  className={`h-1.5 mt-1 ${getProgressColor(projectScore.percent)}`}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Security Checklist */}
      <SecurityAccountChecklist 
        isEmailVerified={isEmailVerified}
        isMFAEnabled={isMFAEnabled}
        onScoreChange={setAccountScore}
      />

      {/* Trusted Devices */}
      <TrustedDevicesManager />

      {/* Recovery Codes */}
      <RecoveryCodesManager />

      {/* Login History */}
      <LoginHistory />

      {/* Auth Security Audit Log */}
      <AuthSecurityAuditLog />

      {/* Log Retention Settings */}
      <LogRetentionSettings />

      {/* Project Security Checklist */}
      <SecurityProjectChecklist 
        onScoreChange={setProjectScore}
      />
    </div>
  );
}
